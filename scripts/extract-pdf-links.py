#!/usr/bin/env python3
"""
extract-pdf-links.py - Scan PDFs for links, annotations, and embedded files.

Extracts all hyperlinks, annotations, and embedded/attached files from the
Epstein DOJ PDFs. Logs everything to a JSONL file for review, then optionally
downloads discovered linked files from justice.gov.

Usage:
    python scripts/extract-pdf-links.py                                # Scan all datasets
    python scripts/extract-pdf-links.py --datasets 1,2,3               # Specific datasets
    python scripts/extract-pdf-links.py --summary                      # Print summary of results
    python scripts/extract-pdf-links.py --download --rate-limit 5      # Download discovered links
    python scripts/extract-pdf-links.py --output path/to/links.jsonl   # Custom output path
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF (fitz) is required. Install with: pip install pymupdf")
    sys.exit(1)

# --- Configuration ---
BASE_DIR = Path(__file__).parent.parent
DOWNLOADS_DIR = BASE_DIR / 'downloads' / 'epstein'
PARSED_DIR = DOWNLOADS_DIR / 'parsed'
DEFAULT_OUTPUT = PARSED_DIR / 'pdf-links.jsonl'
LINKED_FILES_DIR = DOWNLOADS_DIR / 'linked-files'
DOWNLOAD_LOG = DOWNLOADS_DIR / 'linked-downloads.jsonl'
LOG_FILE = PARSED_DIR / 'pdf-links-scan.log'

# DOJ navigation boilerplate URLs — present on every web-saved PDF page
# These are site chrome, not document content
DOJ_BOILERPLATE_URLS = {
    'https://www.justice.gov/contact-us',
    'https://www.justice.gov/careers',
    'https://www.justice.gov/careers/search-jobs',
    'https://www.justice.gov/careers/benefits',
    'https://www.justice.gov/careers/why-justice',
    'https://www.justice.gov/grants',
    'https://www.justice.gov/jm/justice-manual',
    'https://www.justice.gov/publications',
    'https://www.justice.gov/forms',
    'https://www.justice.gov/guidance',
    'https://www.justice.gov/our-work',
    'https://www.justice.gov/history',
    'https://oig.justice.gov/',
    'https://www.usa.gov/',
    'https://vote.gov/',
    'https://public.govdelivery.com/accounts/USDOJ/subscriber/new',
    'https://www.facebook.com/DOJ',
    'https://x.com/TheJusticeDept',
    'https://www.instagram.com/thejusticedept/',
    'https://www.linkedin.com/company/usdoj/mycompany/',
    'http://www.youtube.com/TheJusticeDepartment',
    'https://www.fcc.gov/consumers/guides/711-telecommunications-relay-service',
    'https://www.fcc.gov/trs',
}

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


def discover_pdfs(datasets=None):
    """Find all PDF files to scan for links."""
    files = []
    for ds_dir in sorted(DOWNLOADS_DIR.iterdir()):
        if not ds_dir.is_dir() or not ds_dir.name.startswith('DataSet'):
            continue
        ds_num = int(ds_dir.name.replace('DataSet ', ''))
        if datasets and ds_num not in datasets:
            continue
        for pdf in sorted(ds_dir.glob('*.pdf')):
            files.append({
                'path': str(pdf),
                'efta_id': pdf.stem,
                'dataset': f'DS{ds_num}',
                'dataset_num': ds_num,
            })

    # Also scan loose EFTA files in root
    for pdf in sorted(DOWNLOADS_DIR.glob('EFTA*.pdf')):
        files.append({
            'path': str(pdf),
            'efta_id': pdf.stem,
            'dataset': 'loose',
            'dataset_num': 0,
        })

    return files


def extract_links_from_pdf(pdf_info):
    """Extract all links, annotations, and embedded files from a single PDF."""
    results = []
    pdf_path = pdf_info['path']
    efta_id = pdf_info['efta_id']
    dataset = pdf_info['dataset']

    try:
        doc = fitz.open(pdf_path)

        # 1. Check for embedded/attached files (some PDFs trigger AssertionError)
        try:
            embfile_names = doc.embfile_names()
            for name in embfile_names:
                results.append({
                    'efta_id': efta_id,
                    'dataset': dataset,
                    'page': 0,
                    'link_type': 'embedded_file',
                    'url': None,
                    'filename': name,
                    'status': 'found',
                    'note': f'Embedded file attachment: {name}',
                })
        except (AssertionError, Exception):
            # Some PDFs trigger internal PyMuPDF assertion on embfile_names()
            pass

        # 2. Scan each page for links and annotations
        for page_num in range(len(doc)):
            page = doc[page_num]

            # Get links (URIs, file links, goto links)
            links = page.get_links()
            for link in links:
                link_type = link.get('kind', -1)
                uri = link.get('uri', '')
                file_path = link.get('file', '')
                page_ref = link.get('page', -1)

                if link_type == fitz.LINK_URI and uri:
                    # Classify URL
                    if uri in DOJ_BOILERPLATE_URLS:
                        status = 'boilerplate_skipped'
                        classification = 'uri_boilerplate'
                    elif 'justice.gov/epstein/files' in uri:
                        status = 'queued'
                        classification = 'uri_epstein_file'
                    elif 'justice.gov' in uri:
                        status = 'doj_nav_skipped'
                        classification = 'uri_justice_gov_nav'
                    elif uri.startswith('http'):
                        status = 'external_skipped'
                        classification = 'uri_external'
                    else:
                        status = 'other'
                        classification = 'uri_other'

                    results.append({
                        'efta_id': efta_id,
                        'dataset': dataset,
                        'page': page_num + 1,
                        'link_type': classification,
                        'url': uri,
                        'filename': None,
                        'status': status,
                        'note': None,
                    })

                elif link_type == fitz.LINK_LAUNCH and file_path:
                    results.append({
                        'efta_id': efta_id,
                        'dataset': dataset,
                        'page': page_num + 1,
                        'link_type': 'file_launch',
                        'url': None,
                        'filename': file_path,
                        'status': 'found',
                        'note': f'File launch link: {file_path}',
                    })

                elif link_type == fitz.LINK_GOTO:
                    # Internal page reference - log but low priority
                    results.append({
                        'efta_id': efta_id,
                        'dataset': dataset,
                        'page': page_num + 1,
                        'link_type': 'internal_goto',
                        'url': None,
                        'filename': None,
                        'status': 'internal_ref',
                        'note': f'Goes to page {page_ref + 1}',
                    })

                elif link_type == fitz.LINK_GOTOR and file_path:
                    results.append({
                        'efta_id': efta_id,
                        'dataset': dataset,
                        'page': page_num + 1,
                        'link_type': 'file_goto',
                        'url': None,
                        'filename': file_path,
                        'status': 'found',
                        'note': f'External PDF reference: {file_path}',
                    })

            # 3. Check annotations (wrapped in try/except — some PDFs trigger AssertionError)
            try:
                annots = page.annots()
                if annots:
                    for annot in annots:
                        annot_type = annot.type[1] if annot.type else 'unknown'
                        annot_info = annot.info
                        uri = annot_info.get('uri', '') if annot_info else ''
                        filename = annot_info.get('file', '') if annot_info else ''

                        if uri:
                            if 'justice.gov' in uri:
                                status = 'queued'
                            elif uri.startswith('http'):
                                status = 'external_skipped'
                            else:
                                status = 'other'

                            results.append({
                                'efta_id': efta_id,
                                'dataset': dataset,
                                'page': page_num + 1,
                                'link_type': f'annotation_{annot_type}',
                                'url': uri,
                                'filename': None,
                                'status': status,
                                'note': f'Annotation type: {annot_type}',
                            })

                        if filename:
                            results.append({
                                'efta_id': efta_id,
                                'dataset': dataset,
                                'page': page_num + 1,
                                'link_type': f'annotation_file_{annot_type}',
                                'url': None,
                                'filename': filename,
                                'status': 'found',
                                'note': f'File annotation: {filename}',
                            })
            except (AssertionError, Exception):
                # Some malformed PDFs trigger internal PyMuPDF errors on annots()
                pass

        doc.close()

    except Exception as e:
        error_msg = f'{type(e).__name__}: {str(e)}' if str(e) else type(e).__name__
        results.append({
            'efta_id': efta_id,
            'dataset': dataset,
            'page': 0,
            'link_type': 'error',
            'url': None,
            'filename': None,
            'status': 'error',
            'note': f'Failed to process: {error_msg}',
        })

    return results


def download_linked_files(links_file, rate_limit=5, log_file=None):
    """Download files discovered via link extraction."""
    import requests

    if log_file is None:
        log_file = DOWNLOAD_LOG

    LINKED_FILES_DIR.mkdir(parents=True, exist_ok=True)

    # Read queued links
    queued = []
    with open(links_file, 'r') as f:
        for line in f:
            entry = json.loads(line.strip())
            if entry.get('status') == 'queued' and entry.get('url'):
                queued.append(entry)

    logging.info(f'Found {len(queued)} queued links to download')

    downloaded = 0
    errors = 0

    for i, entry in enumerate(queued):
        url = entry['url']
        efta_id = entry['efta_id']
        timestamp = datetime.now(timezone.utc).isoformat()

        # Derive output filename
        url_filename = url.split('/')[-1] if '/' in url else f'linked-{i:05d}'
        out_path = LINKED_FILES_DIR / f'{efta_id}--{url_filename}'

        if out_path.exists():
            log_entry = {
                'timestamp': timestamp,
                'source_efta': efta_id,
                'url': url,
                'status': 'skipped',
                'action': 'already_exists',
                'output': str(out_path),
            }
            with open(log_file, 'a') as lf:
                lf.write(json.dumps(log_entry) + '\n')
            continue

        try:
            resp = requests.get(url, timeout=30, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            status_code = resp.status_code

            if status_code == 200:
                with open(out_path, 'wb') as f:
                    f.write(resp.content)
                size_kb = len(resp.content) / 1024
                log_entry = {
                    'timestamp': timestamp,
                    'source_efta': efta_id,
                    'url': url,
                    'status': status_code,
                    'action': 'downloaded',
                    'size_kb': round(size_kb, 2),
                    'output': str(out_path),
                }
                downloaded += 1
                logging.info(f'Downloaded: {out_path.name} ({size_kb:.1f} KB)')
            else:
                log_entry = {
                    'timestamp': timestamp,
                    'source_efta': efta_id,
                    'url': url,
                    'status': status_code,
                    'action': 'failed',
                    'error': f'HTTP {status_code}',
                }
                errors += 1
                logging.warning(f'Failed ({status_code}): {url}')

        except Exception as e:
            log_entry = {
                'timestamp': timestamp,
                'source_efta': efta_id,
                'url': url,
                'status': 'error',
                'action': 'exception',
                'error': str(e),
            }
            errors += 1
            logging.error(f'Error downloading {url}: {e}')

        with open(log_file, 'a') as lf:
            lf.write(json.dumps(log_entry) + '\n')

        # Rate limit
        if i < len(queued) - 1:
            time.sleep(rate_limit)

    logging.info(f'Download complete: {downloaded} downloaded, {errors} errors')


def print_summary(links_file):
    """Print summary of extracted links."""
    if not Path(links_file).exists():
        print(f"No results file found at: {links_file}")
        print("Run the scan first: python scripts/extract-pdf-links.py")
        return

    counts = {
        'total': 0,
        'by_type': {},
        'by_status': {},
        'by_dataset': {},
        'errors': 0,
        'unique_urls': set(),
        'embedded_files': [],
        'justice_gov_links': [],
    }

    with open(links_file, 'r') as f:
        for line in f:
            entry = json.loads(line.strip())
            counts['total'] += 1

            link_type = entry.get('link_type', 'unknown')
            status = entry.get('status', 'unknown')
            dataset = entry.get('dataset', 'unknown')

            counts['by_type'][link_type] = counts['by_type'].get(link_type, 0) + 1
            counts['by_status'][status] = counts['by_status'].get(status, 0) + 1
            counts['by_dataset'][dataset] = counts['by_dataset'].get(dataset, 0) + 1

            if status == 'error':
                counts['errors'] += 1

            if entry.get('url'):
                counts['unique_urls'].add(entry['url'])

            if link_type == 'embedded_file':
                counts['embedded_files'].append(entry)

            if status == 'queued':
                counts['justice_gov_links'].append(entry)

    print("\n=== PDF Link Extraction Report ===")
    print(f"Total entries: {counts['total']}")
    print(f"Unique URLs discovered: {len(counts['unique_urls'])}")
    print(f"Errors: {counts['errors']}")

    print(f"\nBy link type:")
    for lt, count in sorted(counts['by_type'].items(), key=lambda x: -x[1]):
        print(f"  {lt}: {count}")

    print(f"\nBy status:")
    for st, count in sorted(counts['by_status'].items(), key=lambda x: -x[1]):
        print(f"  {st}: {count}")

    print(f"\nBy dataset:")
    for ds, count in sorted(counts['by_dataset'].items()):
        print(f"  {ds}: {count}")

    if counts['embedded_files']:
        print(f"\nEmbedded files found ({len(counts['embedded_files'])}):")
        for ef in counts['embedded_files'][:20]:
            print(f"  [{ef['efta_id']}] {ef.get('filename', 'unknown')}")
        if len(counts['embedded_files']) > 20:
            print(f"  ... and {len(counts['embedded_files']) - 20} more")

    if counts['justice_gov_links']:
        print(f"\nJustice.gov links queued for download ({len(counts['justice_gov_links'])}):")
        for jl in counts['justice_gov_links'][:20]:
            print(f"  [{jl['efta_id']}] {jl.get('url', '')[:80]}")
        if len(counts['justice_gov_links']) > 20:
            print(f"  ... and {len(counts['justice_gov_links']) - 20} more")

    print(f"\nFiles:")
    print(f"  Results: {links_file}")
    print(f"  Download log: {DOWNLOAD_LOG}")
    print()


def main():
    parser = argparse.ArgumentParser(description='Extract links from Epstein DOJ PDFs')
    parser.add_argument('--datasets', type=str, default=None, help='Comma-separated dataset numbers (e.g., 1,2,3)')
    parser.add_argument('--output', type=str, default=str(DEFAULT_OUTPUT), help='Output JSONL file path')
    parser.add_argument('--summary', action='store_true', help='Print summary of existing results')
    parser.add_argument('--download', action='store_true', help='Download discovered linked files')
    parser.add_argument('--rate-limit', type=int, default=5, help='Seconds between download requests')
    parser.add_argument('--log-file', type=str, default=str(DOWNLOAD_LOG), help='Download log file path')
    parser.add_argument('--limit', type=int, default=0, help='Process only first N PDFs')
    args = parser.parse_args()

    setup_logging()

    if args.summary:
        print_summary(args.output)
        return

    if args.download:
        download_linked_files(args.output, rate_limit=args.rate_limit, log_file=Path(args.log_file))
        return

    # --- Main scan mode ---
    logging.info('=== PDF Link Extraction Starting ===')

    datasets = None
    if args.datasets:
        datasets = [int(d.strip()) for d in args.datasets.split(',')]

    pdfs = discover_pdfs(datasets=datasets)
    logging.info(f'Discovered {len(pdfs)} PDFs to scan')

    if args.limit > 0:
        pdfs = pdfs[:args.limit]
        logging.info(f'Limited to {len(pdfs)} PDFs')

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    total_links = 0
    total_errors = 0
    files_with_links = 0

    with open(output_path, 'w') as out:
        for i, pdf_info in enumerate(pdfs):
            results = extract_links_from_pdf(pdf_info)

            if results:
                files_with_links += 1
                for entry in results:
                    entry['scanned_at'] = datetime.now(timezone.utc).isoformat()
                    out.write(json.dumps(entry) + '\n')
                    total_links += 1
                    if entry['status'] == 'error':
                        total_errors += 1

            # Progress logging
            if (i + 1) % 1000 == 0 or i == len(pdfs) - 1:
                logging.info(
                    f'Progress: {i + 1}/{len(pdfs)} PDFs scanned — '
                    f'{total_links} links found, {files_with_links} files with links, '
                    f'{total_errors} errors'
                )

    logging.info('=== PDF Link Extraction Complete ===')
    logging.info(f'Total PDFs scanned: {len(pdfs)}')
    logging.info(f'Total links/entries found: {total_links}')
    logging.info(f'Files with links: {files_with_links}')
    logging.info(f'Errors: {total_errors}')
    logging.info(f'Output: {output_path}')

    # Print quick summary
    print_summary(str(output_path))


if __name__ == '__main__':
    main()






