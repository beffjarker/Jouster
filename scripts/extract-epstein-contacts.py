#!/usr/bin/env python3
"""
extract-epstein-contacts.py - Full extraction pipeline for Epstein DOJ files.

Extracts all text via OCR, then identifies and structures contact information
(names, phone numbers, addresses, emails, fax numbers) from the documents.

Outputs:
  - downloads/epstein/parsed/epstein.db (SQLite with full text + contacts tables)
  - downloads/epstein/parsed/contacts.json (structured contact data)
  - downloads/epstein/parsed/extraction-report.md (summary report)
  - dev-journal/personal/contacts/epstein/ (individual contact files)

Usage:
    python scripts/extract-epstein-contacts.py                    # Full pipeline
    python scripts/extract-epstein-contacts.py --ocr-only         # Just OCR, no contact extraction
    python scripts/extract-epstein-contacts.py --contacts-only    # Extract contacts from existing OCR
    python scripts/extract-epstein-contacts.py --limit 100        # Process first N files
    python scripts/extract-epstein-contacts.py --workers 4        # Parallel OCR
    python scripts/extract-epstein-contacts.py --resume           # Resume from checkpoint
    python scripts/extract-epstein-contacts.py --datasets 1,2,3   # Specific datasets
"""

import argparse
import csv
import hashlib
import json
import logging
import os
import re
import sqlite3
import sys
import time
from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

# PDF/Image processing
import fitz  # PyMuPDF

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
    # Set Tesseract path
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
except ImportError:
    HAS_OCR = False

# --- Configuration ---
BASE_DIR = Path(__file__).parent.parent
DOWNLOADS_DIR = BASE_DIR / 'downloads' / 'epstein'
PARSED_DIR = DOWNLOADS_DIR / 'parsed'
IMAGES_DIR = PARSED_DIR / 'images'
DB_FILE = PARSED_DIR / 'epstein.db'
PROGRESS_FILE = PARSED_DIR / 'progress.json'
LOG_FILE = PARSED_DIR / 'extraction-pipeline.log'
CONTACTS_JSON = PARSED_DIR / 'contacts.json'
REPORT_FILE = PARSED_DIR / 'extraction-report.md'
CONTACTS_DIR = BASE_DIR / 'dev-journal' / 'personal' / 'contacts' / 'epstein'

# Tesseract config
TESS_CONFIG_DOC = '--oem 1 --psm 6'
TESS_CONFIG_HANDWRITTEN = '--oem 1 --psm 4'

# --- Regex Patterns for Contact Extraction ---
PHONE_PATTERNS = [
    re.compile(r'\(?\d{3}\)?[\s\-\.]+\d{3}[\s\-\.]+\d{4}'),  # (555) 555-5555
    re.compile(r'\d{3}[\-\.]\d{3}[\-\.]\d{4}'),               # 555-555-5555
    re.compile(r'\d{3}\s\d{3}\s\d{4}'),                       # 555 555 5555
    re.compile(r'\+?1?\s?\(?\d{3}\)?\s?\d{3}[\-\s]\d{4}'),   # +1 (555) 555-5555
    re.compile(r'\d{10,11}'),                                  # 5555555555
]

EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')

FAX_PATTERN = re.compile(r'(?:fax|facsimile|f[\/\:])\s*[:\s]?\s*[\(\d][\d\s\-\.\(\)]+\d', re.IGNORECASE)

ADDRESS_PATTERNS = [
    # Street address with city, state, zip
    re.compile(r'\d+\s+[\w\s]+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Dr(?:ive)?|Ln|Lane|Rd|Road|Way|Pl(?:ace)?|Ct|Court|Cir(?:cle)?|Pkwy|Terr?(?:ace)?)\b[,.\s]+[\w\s]+[,.\s]+[A-Z]{2}\s+\d{5}(?:-\d{4})?', re.IGNORECASE),
    # PO Box
    re.compile(r'P\.?\s*O\.?\s*Box\s+\d+[,.\s]+[\w\s]+[,.\s]+[A-Z]{2}\s+\d{5}(?:-\d{4})?', re.IGNORECASE),
    # City, State ZIP
    re.compile(r'[A-Z][a-z]+(?:\s[A-Z][a-z]+)*,?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?'),
]

# Name patterns - strict patterns for real human names
NAME_PATTERNS = [
    # LAST, First or LAST, First Middle (all caps last name)
    re.compile(r'\b([A-Z][A-Z]{2,}),\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)\b'),
    # Title + First Last (Mr./Mrs./Ms./Dr./Hon./Judge)
    re.compile(r'(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?|Hon\.?|Judge|Senator|Agent|Detective)\s+([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)'),
    # "Attorney [Name]" or "AUSA [Name]"
    re.compile(r'(?:Attorney|AUSA|Counsel|Esq\.?)\s+([A-Z][a-z]{2,}\s+(?:[A-Z]\.?\s+)?[A-Z][a-z]{2,})'),
    # Explicit label patterns: "Name: First Last"
    re.compile(r'(?:Name|Defendant|Plaintiff|Witness|Victim|Suspect)\s*:\s*([A-Z][a-z]{2,}\s+(?:[A-Z]\.?\s+)?[A-Z][a-z]{2,})'),
    # "Jeffrey E. Epstein" style - First M. Last or First Middle Last
    re.compile(r'\b([A-Z][a-z]{2,}\s+[A-Z]\.?\s+[A-Z][a-z]{2,})\b'),
]


# --- Logging ---
def setup_logging(verbose=False):
    """Configure logging."""
    PARSED_DIR.mkdir(parents=True, exist_ok=True)
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[
            logging.FileHandler(LOG_FILE, encoding='utf-8'),
            logging.StreamHandler(sys.stdout),
        ],
    )


# --- File Discovery ---
def discover_files(datasets=None, source='all'):
    """Find all PDF/image files to process."""
    files = []

    if source in ('all', 'doj'):
        # DataSet directories
        for ds_dir in sorted(DOWNLOADS_DIR.iterdir()):
            if not ds_dir.is_dir() or not ds_dir.name.startswith('DataSet'):
                continue
            ds_num = int(ds_dir.name.replace('DataSet ', ''))
            if datasets and ds_num not in datasets:
                continue
            for pdf in sorted(ds_dir.glob('*.pdf')):
                files.append({
                    'source_path': str(pdf),
                    'efta_id': pdf.stem,
                    'source_type': 'doj',
                    'dataset_num': ds_num,
                    'file_type': 'pdf',
                })

        # Root-level PDFs (loose EFTA files)
        for pdf in sorted(DOWNLOADS_DIR.glob('EFTA*.pdf')):
            files.append({
                'source_path': str(pdf),
                'efta_id': pdf.stem,
                'source_type': 'doj-loose',
                'dataset_num': 0,
                'file_type': 'pdf',
            })

    if source in ('all', 'house'):
        house_dir = DOWNLOADS_DIR / 'house-files'
        if house_dir.exists():
            for ext in ('*.jpg', '*.jpeg', '*.tif', '*.tiff', '*.png', '*.pdf'):
                for f in sorted(house_dir.rglob(ext)):
                    files.append({
                        'source_path': str(f),
                        'efta_id': f.stem,
                        'source_type': 'house',
                        'dataset_num': 0,
                        'file_type': f.suffix.lower().lstrip('.'),
                    })

    return files


# --- Image Extraction ---
def extract_image_from_pdf(pdf_path, output_path):
    """Extract embedded image from PDF or render page."""
    try:
        doc = fitz.open(pdf_path)
        if len(doc) == 0:
            doc.close()
            return None

        page = doc[0]
        images = page.get_images(full=True)

        if not images:
            # Render page as image at 300 DPI for better OCR
            pix = page.get_pixmap(dpi=300)
            pix.save(str(output_path))
            doc.close()
            return {'width': pix.width, 'height': pix.height, 'method': 'render', 'pages': len(doc)}

        # Extract first image
        xref = images[0][0]
        img_data = doc.extract_image(xref)
        pages = len(doc)
        doc.close()

        # Convert to PNG
        from PIL import Image as PILImage
        import io
        img = PILImage.open(io.BytesIO(img_data['image']))
        img.save(str(output_path), 'PNG')

        return {
            'width': img_data['width'],
            'height': img_data['height'],
            'method': 'extract',
            'original_format': img_data['ext'],
            'pages': pages,
        }
    except Exception as e:
        logging.error(f'Extract failed for {pdf_path}: {e}')
        return None


def extract_image_from_file(file_path, output_path):
    """Convert image file to PNG."""
    try:
        from PIL import Image as PILImage
        img = PILImage.open(file_path)
        w, h = img.size
        img.save(str(output_path), 'PNG')
        img.close()
        return {'width': w, 'height': h, 'method': 'convert'}
    except Exception as e:
        logging.error(f'Convert failed for {file_path}: {e}')
        return None


# --- Image Classification ---
def classify_image(image_path):
    """Classify image as document, photo, handwritten, or blank."""
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

        # Line detection
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=100,
                                minLineLength=w * 0.3, maxLineGap=10)
        num_lines = len(lines) if lines is not None else 0

        # Pixel variance
        variance = np.var(img.astype(float))

        # Blank detection
        mean_val = np.mean(img)
        if variance < 100 and mean_val > 240:
            return 'blank', 0.95

        # Classification
        if edge_density > 0.08 and num_lines > 5:
            return 'document', min(0.95, edge_density * 5)
        elif edge_density > 0.05 and variance > 3000:
            if num_lines > 2:
                return 'document', min(0.85, edge_density * 4)
            else:
                return 'handwritten', min(0.75, edge_density * 3)
        elif edge_density < 0.03 and variance < 2000:
            return 'photo', min(0.9, 1 - edge_density * 10)
        else:
            return 'document', 0.5

    except Exception as e:
        logging.error(f'Classification failed: {e}')
        return 'unknown', 0.0


# --- OCR ---
def preprocess_for_ocr(image_path):
    """Preprocess image for OCR - optimized for scanned documents."""
    if not HAS_CV2:
        return Image.open(image_path)

    img = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return Image.open(image_path)

    h, w = img.shape

    # Upscale if small
    if max(h, w) < 2000:
        scale = 2
        img = cv2.resize(img, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)

    # Adaptive thresholding
    img = cv2.adaptiveThreshold(img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                cv2.THRESH_BINARY, 15, 8)

    # Light denoise
    img = cv2.medianBlur(img, 3)

    return Image.fromarray(img)


def ocr_image(image_path, classification='document'):
    """Run Tesseract OCR."""
    if not HAS_OCR:
        return '', 0.0

    try:
        img = preprocess_for_ocr(image_path)

        config = TESS_CONFIG_HANDWRITTEN if classification == 'handwritten' else TESS_CONFIG_DOC

        # Get detailed output
        data = pytesseract.image_to_data(img, config=config, output_type=pytesseract.Output.DICT)

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


# --- Contact Extraction ---
def extract_contacts_from_text(text, efta_id=''):
    """Extract contact information from OCR text."""
    contacts = {
        'phones': [],
        'emails': [],
        'faxes': [],
        'addresses': [],
        'names': [],
    }

    if not text or len(text) < 10:
        return contacts

    # Extract phone numbers
    for pattern in PHONE_PATTERNS:
        for match in pattern.finditer(text):
            phone = re.sub(r'[^\d]', '', match.group())
            if 7 <= len(phone) <= 11:
                # Normalize
                if len(phone) == 10:
                    formatted = f'({phone[:3]}) {phone[3:6]}-{phone[6:]}'
                elif len(phone) == 11 and phone[0] == '1':
                    formatted = f'({phone[1:4]}) {phone[4:7]}-{phone[7:]}'
                else:
                    formatted = match.group().strip()
                if formatted not in contacts['phones']:
                    contacts['phones'].append(formatted)

    # Extract emails
    for match in EMAIL_PATTERN.finditer(text):
        email = match.group().lower()
        if email not in contacts['emails']:
            contacts['emails'].append(email)

    # Extract fax numbers
    for match in FAX_PATTERN.finditer(text):
        fax = match.group().strip()
        if fax not in contacts['faxes']:
            contacts['faxes'].append(fax)

    # Extract addresses
    for pattern in ADDRESS_PATTERNS:
        for match in pattern.finditer(text):
            addr = match.group().strip()
            if len(addr) > 10 and addr not in contacts['addresses']:
                contacts['addresses'].append(addr)

    # Extract names
    # Common false positives to exclude
    FALSE_POSITIVE_NAMES = {
        'UNITED STATES', 'SOUTHERN DISTRICT', 'NORTHERN DISTRICT', 'EASTERN DISTRICT',
        'WESTERN DISTRICT', 'DISTRICT COURT', 'NEW YORK', 'WEST PALM', 'LOS ANGELES',
        'SAN FRANCISCO', 'PALM BEACH', 'VIRGIN ISLANDS', 'ATTORNEY GENERAL',
        'PRIVILEGED INFORMATION', 'WORK PRODUCT', 'ORANGE SAVINGS', 'LAW ENFORCEMENT',
        'PRIMARY ACCOUNTHOLDER', 'EFFECTIVE DATE', 'BUSINESS NAME', 'ACCOUNT NO',
    }

    for pattern in NAME_PATTERNS:
        for match in pattern.finditer(text):
            # Get the captured group (the name part)
            if match.lastindex and match.lastindex >= 1:
                # For LAST, First patterns, reconstruct as "First Last"
                if match.lastindex >= 2:
                    name = f"{match.group(2)} {match.group(1).title()}"
                else:
                    name = match.group(1)
            else:
                name = match.group()
            name = name.strip()

            # Strict validation:
            # - Must have at least 2 words
            # - Each word must start with uppercase
            # - No single-char words except middle initials
            # - Must not be in exclude list
            # - Must be between 4-40 chars
            # - Must not contain digits
            words = name.split()
            if (len(words) >= 2
                and 4 <= len(name) <= 40
                and name.upper() not in FALSE_POSITIVE_NAMES
                and not re.search(r'\d', name)
                and all(w[0].isupper() for w in words if len(w) > 1)
                and not re.match(r'^(The|And|For|But|Not|Was|Has|Are|Can|All|This|That|With|From)\b', name)
                ):
                if name not in contacts['names']:
                    contacts['names'].append(name)

    return contacts


# --- Database ---
def init_database():
    """Create/update SQLite database with contacts tables."""
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()

    # Main files table
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

    # Contacts table
    c.execute('''CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        efta_id TEXT NOT NULL,
        contact_type TEXT NOT NULL,
        value TEXT NOT NULL,
        context TEXT,
        extracted_at TEXT,
        FOREIGN KEY (efta_id) REFERENCES files(efta_id)
    )''')

    # People table (aggregated/deduplicated)
    c.execute('''CREATE TABLE IF NOT EXISTS people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phones TEXT,
        emails TEXT,
        addresses TEXT,
        faxes TEXT,
        document_refs TEXT,
        first_seen TEXT,
        last_seen TEXT,
        mention_count INTEGER DEFAULT 1
    )''')

    # Full-text search
    c.execute('''CREATE VIRTUAL TABLE IF NOT EXISTS files_fts
        USING fts5(efta_id, ocr_text, content=files, content_rowid=id)''')

    # Indexes
    c.execute('CREATE INDEX IF NOT EXISTS idx_contacts_efta ON contacts(efta_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_contacts_value ON contacts(value)')

    conn.commit()
    return conn


def save_file_result(conn, result):
    """Save file processing result."""
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


def save_contacts(conn, efta_id, contacts):
    """Save extracted contacts to database."""
    c = conn.cursor()
    now = datetime.now().isoformat()

    for contact_type, values in contacts.items():
        for value in values:
            c.execute('''INSERT INTO contacts (efta_id, contact_type, value, extracted_at)
                VALUES (?, ?, ?, ?)''', (efta_id, contact_type, value, now))

    conn.commit()


# --- Progress Tracking ---
def load_progress():
    """Load progress checkpoint."""
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, 'r') as f:
            return set(json.load(f))
    return set()


def save_progress(processed_ids):
    """Save progress checkpoint."""
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(sorted(processed_ids), f)


# --- Process Single File ---
def process_single_file(file_info, skip_ocr=False):
    """Full pipeline for one file: extract → classify → OCR → extract contacts."""
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
        'contacts': {},
    }

    # Extract image
    if not output_image.exists():
        if file_info['file_type'] == 'pdf':
            img_info = extract_image_from_pdf(source_path, output_image)
        else:
            img_info = extract_image_from_file(source_path, output_image)

        if img_info is None:
            result['error'] = 'extraction_failed'
            return result

        result['width'] = img_info['width']
        result['height'] = img_info['height']
    else:
        try:
            from PIL import Image as PILImage
            with PILImage.open(output_image) as img:
                result['width'], result['height'] = img.size
        except Exception:
            pass

    result['orientation'] = 'landscape' if result['width'] > result['height'] else 'portrait'

    # Classify
    classification, conf = classify_image(output_image)
    result['classification'] = classification
    result['classification_confidence'] = round(conf, 3)

    # OCR
    if not skip_ocr and classification in ('document', 'handwritten', 'unknown'):
        ocr_text, ocr_conf = ocr_image(output_image, classification)
        result['ocr_text'] = ocr_text
        result['ocr_confidence'] = round(ocr_conf, 1)

        # Extract contacts from OCR text
        if ocr_text:
            result['contacts'] = extract_contacts_from_text(ocr_text, efta_id)

    return result


# --- Report Generation ---
def generate_report(conn):
    """Generate extraction report."""
    c = conn.cursor()

    c.execute('SELECT COUNT(*) FROM files')
    total_files = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM files WHERE ocr_text != ''")
    with_text = c.fetchone()[0]

    c.execute("SELECT AVG(ocr_confidence) FROM files WHERE ocr_confidence > 0")
    avg_conf = c.fetchone()[0] or 0

    c.execute("SELECT classification, COUNT(*) FROM files GROUP BY classification")
    classifications = dict(c.fetchall())

    c.execute("SELECT contact_type, COUNT(*) FROM contacts GROUP BY contact_type")
    contact_counts = dict(c.fetchall())

    c.execute("SELECT COUNT(DISTINCT value) FROM contacts WHERE contact_type = 'phones'")
    unique_phones = c.fetchone()[0]

    c.execute("SELECT COUNT(DISTINCT value) FROM contacts WHERE contact_type = 'emails'")
    unique_emails = c.fetchone()[0]

    c.execute("SELECT COUNT(DISTINCT value) FROM contacts WHERE contact_type = 'names'")
    unique_names = c.fetchone()[0]

    # Top mentioned names
    c.execute("""SELECT value, COUNT(*) as cnt FROM contacts
                 WHERE contact_type = 'names' GROUP BY value ORDER BY cnt DESC LIMIT 50""")
    top_names = c.fetchall()

    # Top phone numbers
    c.execute("""SELECT value, COUNT(*) as cnt FROM contacts
                 WHERE contact_type = 'phones' GROUP BY value ORDER BY cnt DESC LIMIT 30""")
    top_phones = c.fetchall()

    # Top emails
    c.execute("""SELECT value, COUNT(*) as cnt FROM contacts
                 WHERE contact_type = 'emails' GROUP BY value ORDER BY cnt DESC LIMIT 30""")
    top_emails = c.fetchall()

    report = f"""# Epstein Files — Extraction Report

> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
> Database: `downloads/epstein/parsed/epstein.db`

---

## Summary

| Metric | Value |
|--------|-------|
| Total files processed | {total_files} |
| Files with OCR text | {with_text} |
| Average OCR confidence | {avg_conf:.1f}% |
| Unique phone numbers | {unique_phones} |
| Unique email addresses | {unique_emails} |
| Unique names extracted | {unique_names} |

## Document Classification

| Type | Count |
|------|-------|
"""
    for cls, count in sorted(classifications.items(), key=lambda x: -x[1]):
        report += f"| {cls} | {count} |\n"

    report += f"""
## Contact Extraction

| Type | Total Extractions |
|------|------------------|
"""
    for ctype, count in sorted(contact_counts.items(), key=lambda x: -x[1]):
        report += f"| {ctype} | {count} |\n"

    if top_names:
        report += "\n## Top Names (by frequency)\n\n| Name | Mentions |\n|------|----------|\n"
        for name, cnt in top_names:
            report += f"| {name} | {cnt} |\n"

    if top_phones:
        report += "\n## Top Phone Numbers (by frequency)\n\n| Phone | Mentions |\n|-------|----------|\n"
        for phone, cnt in top_phones:
            report += f"| {phone} | {cnt} |\n"

    if top_emails:
        report += "\n## Top Email Addresses (by frequency)\n\n| Email | Mentions |\n|-------|----------|\n"
        for email, cnt in top_emails:
            report += f"| {email} | {cnt} |\n"

    report += f"""
---

## Search Examples

```sql
-- Full-text search
SELECT efta_id, snippet(files_fts, 1, '<b>', '</b>', '...', 30) as excerpt
FROM files_fts WHERE files_fts MATCH 'flight log';

-- Find all contacts in a document
SELECT * FROM contacts WHERE efta_id = 'EFTA00000001';

-- Find documents mentioning a phone number
SELECT f.efta_id, f.ocr_text FROM files f
JOIN contacts c ON f.efta_id = c.efta_id
WHERE c.contact_type = 'phones' AND c.value LIKE '%555%';

-- Find all documents mentioning a name
SELECT DISTINCT efta_id FROM contacts
WHERE contact_type = 'names' AND value LIKE '%Smith%';
```

---

## File Locations

| What | Path |
|------|------|
| SQLite database | `downloads/epstein/parsed/epstein.db` |
| Contacts JSON | `downloads/epstein/parsed/contacts.json` |
| Extracted images | `downloads/epstein/parsed/images/` |
| Contact files | `dev-journal/personal/contacts/epstein/` |
| This report | `downloads/epstein/parsed/extraction-report.md` |
"""

    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write(report)

    logging.info(f'Report written to {REPORT_FILE}')
    return report


# --- Contact File Generation ---
def generate_contact_files(conn):
    """Generate individual contact markdown files from extracted data."""
    CONTACTS_DIR.mkdir(parents=True, exist_ok=True)

    c = conn.cursor()

    # Get aggregated contact data - group by name with associated info
    c.execute("""
        SELECT c1.value as name,
               GROUP_CONCAT(DISTINCT c2.value) as phones,
               GROUP_CONCAT(DISTINCT c3.value) as emails,
               GROUP_CONCAT(DISTINCT c4.value) as addresses,
               GROUP_CONCAT(DISTINCT c1.efta_id) as documents,
               COUNT(DISTINCT c1.efta_id) as doc_count
        FROM contacts c1
        LEFT JOIN contacts c2 ON c1.efta_id = c2.efta_id AND c2.contact_type = 'phones'
        LEFT JOIN contacts c3 ON c1.efta_id = c3.efta_id AND c3.contact_type = 'emails'
        LEFT JOIN contacts c4 ON c1.efta_id = c4.efta_id AND c4.contact_type = 'addresses'
        WHERE c1.contact_type = 'names'
        GROUP BY c1.value
        HAVING doc_count >= 1
        ORDER BY doc_count DESC
    """)

    contacts_generated = 0
    all_contacts = []

    for row in c.fetchall():
        name, phones, emails, addresses, documents, doc_count = row

        # Clean name for filename
        clean_name = re.sub(r'[^\w\s\-]', '', name).strip()
        if not clean_name or len(clean_name) < 3:
            continue

        filename = clean_name.replace(' ', '-') + '.md'
        filepath = CONTACTS_DIR / filename

        phones_list = [p for p in (phones or '').split(',') if p.strip()] if phones else []
        emails_list = [e for e in (emails or '').split(',') if e.strip()] if emails else []
        addresses_list = [a for a in (addresses or '').split(',') if a.strip()] if addresses else []
        doc_list = [d for d in (documents or '').split(',') if d.strip()] if documents else []

        contact_data = {
            'name': name,
            'phones': phones_list[:5],  # Limit to prevent noise
            'emails': emails_list[:5],
            'addresses': addresses_list[:3],
            'documents': doc_list[:20],
            'mention_count': doc_count,
        }
        all_contacts.append(contact_data)

        # Generate markdown file
        phone_str = phones_list[0] if phones_list else ''
        email_str = emails_list[0] if emails_list else ''
        address_str = addresses_list[0] if addresses_list else ''

        content = f"""---
type: contact
tags: [contact, epstein-files, public-record]
relationship: [public-figure]
status: unverified
verified: false
verification_source: "DOJ Epstein Document Release"
source_documents: [{', '.join(doc_list[:10])}]
mention_count: {doc_count}
extracted_date: "{datetime.now().strftime('%Y-%m-%d')}"
---

# {name}

> Extracted from DOJ Epstein document release (public record)

## Vital Info
- **Full Name:** {name}
- **Known As:**
- **Phone:** {phone_str}
- **Email:** {email_str}
- **Address:** {address_str}

## Source Documents
"""
        for doc in doc_list[:20]:
            content += f"- {doc}\n"

        if phones_list:
            content += "\n## Phone Numbers Found\n"
            for p in phones_list:
                content += f"- {p}\n"

        if emails_list:
            content += "\n## Email Addresses Found\n"
            for e in emails_list:
                content += f"- {e}\n"

        if addresses_list:
            content += "\n## Addresses Found\n"
            for a in addresses_list:
                content += f"- {a}\n"

        content += f"""
## Notes
- Extracted via OCR from DOJ Epstein document release
- All information is from publicly released court documents
- Mention count: {doc_count} document(s)
- Extraction date: {datetime.now().strftime('%Y-%m-%d')}

## Legal Records
- Source: DOJ Epstein Files (justice.gov/epstein)
"""

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        contacts_generated += 1

    # Save aggregated contacts JSON
    with open(CONTACTS_JSON, 'w', encoding='utf-8') as f:
        json.dump({
            'generated_at': datetime.now().isoformat(),
            'total_contacts': len(all_contacts),
            'contacts': all_contacts,
        }, f, indent=2, ensure_ascii=False)

    logging.info(f'Generated {contacts_generated} contact files in {CONTACTS_DIR}')
    logging.info(f'Contacts JSON saved to {CONTACTS_JSON}')
    return contacts_generated


# --- Main Pipeline ---
def main():
    parser = argparse.ArgumentParser(description='Extract contacts from Epstein DOJ files')
    parser.add_argument('--datasets', type=str, default=None, help='Comma-separated dataset numbers')
    parser.add_argument('--source', choices=['all', 'doj', 'house'], default='all')
    parser.add_argument('--ocr-only', action='store_true', help='Only run OCR, skip contact extraction')
    parser.add_argument('--contacts-only', action='store_true', help='Only extract contacts from existing OCR data')
    parser.add_argument('--report-only', action='store_true', help='Only generate report from existing data')
    parser.add_argument('--skip-ocr', action='store_true', help='Skip OCR step')
    parser.add_argument('--resume', action='store_true', help='Resume from checkpoint')
    parser.add_argument('--workers', type=int, default=1, help='Parallel workers')
    parser.add_argument('--limit', type=int, default=0, help='Process first N files')
    parser.add_argument('--batch-size', type=int, default=50, help='Progress save interval')
    parser.add_argument('--verbose', action='store_true')
    args = parser.parse_args()

    setup_logging(args.verbose)
    logging.info('=' * 60)
    logging.info('  EPSTEIN FILES — FULL EXTRACTION PIPELINE')
    logging.info('=' * 60)
    logging.info(f'Config: datasets={args.datasets}, source={args.source}, workers={args.workers}')

    # Parse dataset filter
    datasets = None
    if args.datasets:
        datasets = [int(d.strip()) for d in args.datasets.split(',')]

    # Create directories
    PARSED_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    # Initialize database
    conn = init_database()

    # Report-only mode
    if args.report_only:
        generate_report(conn)
        generate_contact_files(conn)
        conn.close()
        return

    # Contacts-only mode (from existing OCR data)
    if args.contacts_only:
        logging.info('Extracting contacts from existing OCR data...')
        c = conn.cursor()
        c.execute("DELETE FROM contacts")  # Clear existing contacts
        conn.commit()

        c.execute("SELECT efta_id, ocr_text FROM files WHERE ocr_text != ''")
        rows = c.fetchall()
        total_contacts = 0
        for efta_id, ocr_text in rows:
            contacts = extract_contacts_from_text(ocr_text, efta_id)
            save_contacts(conn, efta_id, contacts)
            n = sum(len(v) for v in contacts.values())
            total_contacts += n

        logging.info(f'Extracted {total_contacts} contact items from {len(rows)} documents')
        generate_report(conn)
        generate_contact_files(conn)
        conn.close()
        return

    # Full pipeline
    files = discover_files(datasets=datasets, source=args.source)
    logging.info(f'Discovered {len(files)} files to process')

    if args.limit > 0:
        files = files[:args.limit]
        logging.info(f'Limited to {len(files)} files')

    # Resume support
    processed_ids = load_progress() if args.resume else set()
    if processed_ids:
        logging.info(f'Resuming: {len(processed_ids)} already processed')
        files = [f for f in files if f['efta_id'] not in processed_ids]
        logging.info(f'{len(files)} remaining')

    if not files:
        logging.info('No files to process.')
        generate_report(conn)
        generate_contact_files(conn)
        conn.close()
        return

    # Process
    start_time = time.time()
    total = len(files)
    completed = 0
    errors = 0
    total_contacts_found = 0

    for i, file_info in enumerate(files):
        result = process_single_file(file_info, args.skip_ocr)

        # Save to database
        save_file_result(conn, result)

        # Save contacts
        contacts = result.get('contacts', {})
        if contacts:
            save_contacts(conn, result['efta_id'], contacts)
            n = sum(len(v) for v in contacts.values())
            total_contacts_found += n

        processed_ids.add(result['efta_id'])
        completed += 1
        if result['error']:
            errors += 1

        # Progress reporting
        if completed % args.batch_size == 0:
            save_progress(processed_ids)
            elapsed = time.time() - start_time
            rate = completed / elapsed if elapsed > 0 else 0
            eta = (total - completed) / rate if rate > 0 else 0
            logging.info(
                f'Progress: {completed}/{total} ({completed/total*100:.1f}%) | '
                f'{rate:.1f} files/s | ETA: {eta/60:.1f}min | '
                f'Contacts found: {total_contacts_found}'
            )

        if completed % 10 == 0:
            cls = result['classification']
            conf = result['ocr_confidence']
            txt_len = len(result.get('ocr_text', ''))
            n_contacts = sum(len(v) for v in contacts.values()) if contacts else 0
            logging.info(
                f'  [{completed}/{total}] {result["efta_id"]}: '
                f'{cls} | OCR: {conf}% | {txt_len} chars | {n_contacts} contacts'
            )

    # Final save
    save_progress(processed_ids)

    elapsed = time.time() - start_time
    logging.info('=' * 60)
    logging.info('  PIPELINE COMPLETE')
    logging.info('=' * 60)
    logging.info(f'Processed: {completed}/{total}')
    logging.info(f'Errors: {errors}')
    logging.info(f'Total contacts found: {total_contacts_found}')
    if completed > 0:
        logging.info(f'Time: {elapsed/60:.1f} minutes ({elapsed/completed:.2f}s per file)')
    logging.info(f'Database: {DB_FILE}')

    # Generate report and contact files
    if not args.ocr_only:
        generate_report(conn)
        generate_contact_files(conn)

    conn.close()
    logging.info('Done.')


if __name__ == '__main__':
    main()




