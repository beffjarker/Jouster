#!/usr/bin/env python3
"""
parse-epstein-pdfs.py - Extract images from Epstein DOJ PDFs, classify, OCR, and build database.

Usage:
    python scripts/parse-epstein-pdfs.py                          # Process all available files
    python scripts/parse-epstein-pdfs.py --datasets 1,2           # Specific datasets only
    python scripts/parse-epstein-pdfs.py --source house           # House files only
    python scripts/parse-epstein-pdfs.py --skip-ocr               # Extract + classify only
    python scripts/parse-epstein-pdfs.py --resume                 # Resume interrupted run
    python scripts/parse-epstein-pdfs.py --workers 8              # Parallel OCR workers
    python scripts/parse-epstein-pdfs.py --limit 100              # Process first N files only
"""

import argparse
import csv
import fitz  # PyMuPDF
import hashlib
import json
import logging
import os
import shutil
import sqlite3
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

# Optional imports
try:
    import cv2
    import numpy as np
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

try:
    import pytesseract
    from PIL import Image
    HAS_OCR = True
except ImportError:
    HAS_OCR = False

# --- Configuration ---
BASE_DIR = Path(__file__).parent.parent
DOWNLOADS_DIR = BASE_DIR / 'downloads' / 'epstein'
PARSED_DIR = DOWNLOADS_DIR / 'parsed'
IMAGES_DIR = PARSED_DIR / 'images'
MANIFEST_FILE = PARSED_DIR / 'extraction_manifest.csv'
PROGRESS_FILE = PARSED_DIR / 'progress.json'
DB_FILE = PARSED_DIR / 'epstein.db'
LOG_FILE = PARSED_DIR / 'pipeline.log'
TESSDATA_DIR = BASE_DIR / 'dev-tools'

# Tesseract config
TESS_CONFIG_DOC = '--oem 1 --psm 6'
TESS_CONFIG_HANDWRITTEN = '--oem 1 --psm 4'

# --- Logging ---
def setup_logging():
    """Configure logging to both file and console."""
    PARSED_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[
            logging.FileHandler(LOG_FILE, encoding='utf-8'),
            logging.StreamHandler(sys.stdout),
        ],
    )

# --- Step 1: Discover Files ---
def discover_files(datasets=None, source='all'):
    """Find all PDF and JPG files to process."""
    files = []

    if source in ('all', 'doj'):
        for ds_dir in sorted(DOWNLOADS_DIR.iterdir()):
            if not ds_dir.is_dir() or not ds_dir.name.startswith('DataSet'):
                continue
            ds_num = int(ds_dir.name.replace('DataSet ', ''))
            if datasets and ds_num not in datasets:
                continue
            for pdf in sorted(ds_dir.glob('*.pdf')):
                efta_id = pdf.stem
                files.append({
                    'source_path': str(pdf),
                    'efta_id': efta_id,
                    'source_type': 'doj',
                    'dataset_num': ds_num,
                    'file_type': 'pdf',
                })

    if source in ('all', 'house'):
        house_dir = DOWNLOADS_DIR / 'house-files'
        if house_dir.exists():
            for img_file in sorted(house_dir.rglob('*.jpg')) + sorted(house_dir.rglob('*.tif')) + sorted(house_dir.rglob('*.tiff')):
                file_id = img_file.stem
                files.append({
                    'source_path': str(img_file),
                    'efta_id': file_id,
                    'source_type': 'house',
                    'dataset_num': 0,
                    'file_type': img_file.suffix.lower().lstrip('.'),
                })

    return files


# --- Step 2: Extract Images ---
def extract_image_from_pdf(pdf_path, output_path):
    """Extract embedded image from a single-page PDF."""
    try:
        doc = fitz.open(pdf_path)
        if len(doc) == 0:
            return None

        page = doc[0]
        images = page.get_images(full=True)
        if not images:
            # No embedded image — render page as image
            pix = page.get_pixmap(dpi=200)
            pix.save(str(output_path))
            doc.close()
            return {'width': pix.width, 'height': pix.height, 'method': 'render'}

        # Extract first (and usually only) image
        xref = images[0][0]
        img_data = doc.extract_image(xref)
        doc.close()

        # Save image
        ext = img_data['ext']
        if ext != 'png':
            # Convert to PNG for consistency
            from PIL import Image as PILImage
            import io
            img = PILImage.open(io.BytesIO(img_data['image']))
            img.save(str(output_path), 'PNG')
        else:
            with open(output_path, 'wb') as f:
                f.write(img_data['image'])

        return {
            'width': img_data['width'],
            'height': img_data['height'],
            'method': 'extract',
            'original_format': ext,
        }
    except Exception as e:
        logging.error(f'Failed to extract image from {pdf_path}: {e}')
        return None


def extract_image_from_jpg(jpg_path, output_path):
    """Copy/convert a JPG/TIF to the staging directory."""
    try:
        from PIL import Image as PILImage
        img = PILImage.open(jpg_path)
        w, h = img.size
        img.save(str(output_path), 'PNG')
        img.close()
        return {'width': w, 'height': h, 'method': 'convert', 'original_format': Path(jpg_path).suffix.lstrip('.')}
    except Exception as e:
        logging.error(f'Failed to convert {jpg_path}: {e}')
        return None


# --- Step 3: Classify Images ---
def classify_image(image_path):
    """
    Classify an image as document, photo, or handwritten.
    Uses heuristics: edge density, line detection, variance.
    """
    if not HAS_CV2:
        return 'unknown', 0.0

    try:
        img = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
        if img is None:
            return 'unknown', 0.0

        h, w = img.shape

        # Edge detection
        edges = cv2.Canny(img, 50, 150)
        edge_density = np.sum(edges > 0) / (h * w)

        # Line detection (documents have many horizontal lines)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=100, minLineLength=w * 0.3, maxLineGap=10)
        num_lines = len(lines) if lines is not None else 0

        # Pixel variance (documents have high contrast, photos are smoother)
        variance = np.var(img.astype(float))

        # Classification heuristics
        # Documents: high edge density, many lines, high variance
        # Photos: lower edge density, fewer lines, medium variance
        # Handwritten: medium edge density, few lines, variable

        if edge_density > 0.08 and num_lines > 5:
            return 'document', min(0.95, edge_density * 5)
        elif edge_density > 0.05 and variance > 3000:
            # Could be handwritten or typed document
            if num_lines > 2:
                return 'document', min(0.85, edge_density * 4)
            else:
                return 'handwritten', min(0.75, edge_density * 3)
        elif edge_density < 0.03 and variance < 2000:
            return 'photo', min(0.9, 1 - edge_density * 10)
        else:
            # Default to document (safe for OCR)
            return 'document', 0.5

    except Exception as e:
        logging.error(f'Classification failed for {image_path}: {e}')
        return 'unknown', 0.0


# --- Step 4: OCR ---
def preprocess_for_ocr(image_path):
    """Preprocess image for better OCR results."""
    if not HAS_CV2:
        return Image.open(image_path)

    img = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return Image.open(image_path)

    # Upscale 2x for better OCR
    h, w = img.shape
    img = cv2.resize(img, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)

    # Adaptive thresholding for scanned documents
    img = cv2.adaptiveThreshold(img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 8)

    # Denoise
    img = cv2.medianBlur(img, 3)

    # Convert back to PIL
    return Image.fromarray(img)


def ocr_image(image_path, classification='document'):
    """Run Tesseract OCR on an image."""
    if not HAS_OCR:
        return '', 0.0

    try:
        # Preprocess
        img = preprocess_for_ocr(image_path)

        # Choose config based on classification
        config = TESS_CONFIG_HANDWRITTEN if classification == 'handwritten' else TESS_CONFIG_DOC

        # Add tessdata path if available
        if TESSDATA_DIR.exists():
            config += f' --tessdata-dir "{TESSDATA_DIR}"'

        # Run OCR with confidence data
        data = pytesseract.image_to_data(img, config=config, output_type=pytesseract.Output.DICT)

        # Extract text and calculate average confidence
        words = []
        confidences = []
        for i, text in enumerate(data['text']):
            conf = int(data['conf'][i])
            if conf > 0 and text.strip():
                words.append(text.strip())
                confidences.append(conf)

        full_text = ' '.join(words)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return full_text, avg_confidence

    except Exception as e:
        logging.error(f'OCR failed for {image_path}: {e}')
        return '', 0.0


def process_single_file(file_info, skip_ocr=False):
    """Process a single file: extract, classify, optionally OCR."""
    efta_id = file_info['efta_id']
    source_path = file_info['source_path']
    output_image = IMAGES_DIR / f"{efta_id}.png"

    result = {
        'efta_id': efta_id,
        'source_path': source_path,
        'source_type': file_info['source_type'],
        'dataset_num': file_info['dataset_num'],
        'image_path': str(output_image),
        'width': 0,
        'height': 0,
        'orientation': '',
        'classification': 'unknown',
        'classification_confidence': 0.0,
        'ocr_text': '',
        'ocr_confidence': 0.0,
        'processed_at': datetime.now().isoformat(),
        'error': '',
    }

    # Step 1: Extract image
    if not output_image.exists():
        if file_info['file_type'] == 'pdf':
            img_info = extract_image_from_pdf(source_path, output_image)
        else:
            img_info = extract_image_from_jpg(source_path, output_image)

        if img_info is None:
            result['error'] = 'extraction_failed'
            return result

        result['width'] = img_info['width']
        result['height'] = img_info['height']
    else:
        # Image already extracted, get dimensions
        try:
            from PIL import Image as PILImage
            with PILImage.open(output_image) as img:
                result['width'], result['height'] = img.size
        except Exception:
            pass

    result['orientation'] = 'landscape' if result['width'] > result['height'] else 'portrait'

    # Step 2: Classify
    classification, conf = classify_image(output_image)
    result['classification'] = classification
    result['classification_confidence'] = round(conf, 3)

    # Step 3: OCR (if not skipped and classified as document/handwritten)
    if not skip_ocr and classification in ('document', 'handwritten', 'unknown'):
        ocr_text, ocr_conf = ocr_image(output_image, classification)
        result['ocr_text'] = ocr_text
        result['ocr_confidence'] = round(ocr_conf, 1)

    return result


# --- Step 5: Database ---
def init_database():
    """Create SQLite database with schema."""
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        efta_id TEXT UNIQUE NOT NULL,
        source_type TEXT NOT NULL,
        dataset_num INTEGER,
        source_path TEXT,
        image_path TEXT,
        width INTEGER,
        height INTEGER,
        orientation TEXT,
        classification TEXT,
        classification_confidence REAL,
        ocr_text TEXT,
        ocr_confidence REAL,
        processed_at TEXT,
        error TEXT
    )''')

    # Full-text search index
    c.execute('''CREATE VIRTUAL TABLE IF NOT EXISTS files_fts
        USING fts5(efta_id, ocr_text, content=files, content_rowid=id)''')

    # Triggers to keep FTS in sync
    c.execute('''CREATE TRIGGER IF NOT EXISTS files_ai AFTER INSERT ON files BEGIN
        INSERT INTO files_fts(rowid, efta_id, ocr_text) VALUES (new.id, new.efta_id, new.ocr_text);
    END''')

    c.execute('''CREATE TRIGGER IF NOT EXISTS files_au AFTER UPDATE ON files BEGIN
        INSERT INTO files_fts(files_fts, rowid, efta_id, ocr_text) VALUES('delete', old.id, old.efta_id, old.ocr_text);
        INSERT INTO files_fts(rowid, efta_id, ocr_text) VALUES (new.id, new.efta_id, new.ocr_text);
    END''')

    conn.commit()
    return conn


def save_result_to_db(conn, result):
    """Insert or update a result in the database."""
    c = conn.cursor()
    c.execute('''INSERT OR REPLACE INTO files
        (efta_id, source_type, dataset_num, source_path, image_path,
         width, height, orientation, classification, classification_confidence,
         ocr_text, ocr_confidence, processed_at, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (result['efta_id'], result['source_type'], result['dataset_num'],
         result['source_path'], result['image_path'],
         result['width'], result['height'], result['orientation'],
         result['classification'], result['classification_confidence'],
         result['ocr_text'], result['ocr_confidence'],
         result['processed_at'], result['error']))
    conn.commit()


# --- Progress Tracking ---
def load_progress():
    """Load set of already-processed file IDs."""
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, 'r') as f:
            return set(json.load(f))
    return set()


def save_progress(processed_ids):
    """Save set of processed file IDs."""
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(sorted(processed_ids), f)


# --- Main Pipeline ---
def main():
    parser = argparse.ArgumentParser(description='Parse Epstein DOJ PDFs into structured data')
    parser.add_argument('--datasets', type=str, default=None, help='Comma-separated dataset numbers (e.g., 1,2,3)')
    parser.add_argument('--source', choices=['all', 'doj', 'house'], default='all', help='Source type to process')
    parser.add_argument('--skip-ocr', action='store_true', help='Skip OCR step (extract + classify only)')
    parser.add_argument('--resume', action='store_true', help='Resume from last checkpoint')
    parser.add_argument('--workers', type=int, default=1, help='Number of parallel workers for OCR')
    parser.add_argument('--limit', type=int, default=0, help='Process only first N files')
    parser.add_argument('--batch-size', type=int, default=50, help='Save progress every N files')
    args = parser.parse_args()

    setup_logging()
    logging.info('=== Epstein PDF Parsing Pipeline ===')
    logging.info(f'Config: datasets={args.datasets}, source={args.source}, skip_ocr={args.skip_ocr}, workers={args.workers}')

    # Parse dataset filter
    datasets = None
    if args.datasets:
        datasets = [int(d.strip()) for d in args.datasets.split(',')]

    # Create output directories
    PARSED_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    # Discover files
    files = discover_files(datasets=datasets, source=args.source)
    logging.info(f'Discovered {len(files)} files to process')

    if args.limit > 0:
        files = files[:args.limit]
        logging.info(f'Limited to {len(files)} files')

    # Load progress for resume
    processed_ids = load_progress() if args.resume else set()
    if processed_ids:
        logging.info(f'Resuming: {len(processed_ids)} files already processed')
        files = [f for f in files if f['efta_id'] not in processed_ids]
        logging.info(f'{len(files)} files remaining')

    if not files:
        logging.info('No files to process. Done.')
        return

    # Initialize database
    conn = init_database()

    # Process files
    start_time = time.time()
    total = len(files)
    completed = 0
    errors = 0

    if args.workers > 1 and not args.skip_ocr:
        # Parallel processing
        logging.info(f'Processing with {args.workers} workers...')
        with ProcessPoolExecutor(max_workers=args.workers) as executor:
            futures = {executor.submit(process_single_file, f, args.skip_ocr): f for f in files}
            for future in as_completed(futures):
                try:
                    result = future.result()
                    save_result_to_db(conn, result)
                    processed_ids.add(result['efta_id'])
                    completed += 1
                    if result['error']:
                        errors += 1

                    if completed % args.batch_size == 0:
                        save_progress(processed_ids)
                        elapsed = time.time() - start_time
                        rate = completed / elapsed
                        eta = (total - completed) / rate if rate > 0 else 0
                        logging.info(f'Progress: {completed}/{total} ({completed/total*100:.1f}%) - {rate:.1f} files/s - ETA: {eta/60:.1f}min')
                except Exception as e:
                    errors += 1
                    logging.error(f'Worker error: {e}')
    else:
        # Sequential processing
        for i, file_info in enumerate(files):
            result = process_single_file(file_info, args.skip_ocr)
            save_result_to_db(conn, result)
            processed_ids.add(result['efta_id'])
            completed += 1
            if result['error']:
                errors += 1

            if completed % args.batch_size == 0:
                save_progress(processed_ids)
                elapsed = time.time() - start_time
                rate = completed / elapsed
                eta = (total - completed) / rate if rate > 0 else 0
                logging.info(f'Progress: {completed}/{total} ({completed/total*100:.1f}%) - {rate:.1f} files/s - ETA: {eta/60:.1f}min')

            if completed % 10 == 0:
                cls = result['classification']
                conf = result['ocr_confidence']
                txt_len = len(result.get('ocr_text', ''))
                logging.info(f'  [{completed}/{total}] {result["efta_id"]}: {cls} (OCR: {conf}% conf, {txt_len} chars)')

    # Final save
    save_progress(processed_ids)
    conn.close()

    elapsed = time.time() - start_time
    logging.info('=== Pipeline Complete ===')
    logging.info(f'Processed: {completed}/{total}')
    logging.info(f'Errors: {errors}')
    logging.info(f'Time: {elapsed/60:.1f} minutes ({elapsed/completed:.2f}s per file)' if completed > 0 else 'Time: 0')
    logging.info(f'Database: {DB_FILE}')
    logging.info(f'Images: {IMAGES_DIR}')


if __name__ == '__main__':
    main()

