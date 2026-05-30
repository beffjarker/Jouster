#!/usr/bin/env python3
"""
scan-epstein-extensions.py - Probe DOJ URLs for companion files at known EFTA IDs.

For each EFTA ID already on disk (as .pdf), checks if other file types exist
at the same URL path (e.g., .mp3, .mp4, .wav, .doc, .jpg, etc.).

Logs all probes (successes, 404s, errors) to a JSONL file.

Usage:
    python scripts/scan-epstein-extensions.py                          # Scan all datasets
    python scripts/scan-epstein-extensions.py --datasets 1,2,3         # Specific datasets
    python scripts/scan-epstein-extensions.py --resume                 # Resume from checkpoint
    python scripts/scan-epstein-extensions.py --report                 # Print summary report
    python scripts/scan-epstein-extensions.py --rate-limit 2.0         # Custom rate limit
    python scripts/scan-epstein-extensions.py --use-head               # Use HEAD requests (faster)
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote as url_quote

try:
    import requests
except ImportError:
    print("ERROR: requests is required. Install with: pip install requests")
    sys.exit(1)

# --- Configuration ---
BASE_DIR = Path(__file__).parent.parent
DOWNLOADS_DIR = BASE_DIR / 'downloads' / 'epstein'
PARSED_DIR = DOWNLOADS_DIR / 'parsed'
RESULTS_FILE = DOWNLOADS_DIR / 'extension-scan-results.jsonl'
PROGRESS_FILE = DOWNLOADS_DIR / 'extension-scan-progress-v2.json'
LOG_FILE = PARSED_DIR / 'extension-scan-v2.log'

DOJ_BASE_URL = "https://www.justice.gov/epstein/files"

EXTENSIONS = [
    '.mp3', '.mp4', '.wav', '.jpg', '.jpeg', '.tif', '.tiff',
    '.doc', '.docx', '.txt', '.xls', '.xlsx', '.png', '.gif', '.bmp',
]

HEADERS = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'referer': 'https://www.justice.gov/epstein',
    'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'upgrade-insecure-requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
}

# Cookie string — UPDATE if expired
COOKIE_STRING = 'nmstat=df771102-d8aa-11c0-f3f7-26266b706c64; _ga=GA1.1.1585995321.1770279923; justiceGovAgeVerified=true'


# --- Logging ---
def setup_logging():
    """Configure logging."""
    PARSED_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[
            logging.FileHandler(LOG_FILE, encoding='utf-8'),
            logging.StreamHandler(sys.stdout),
        ],
    )


def discover_efta_ids(datasets=None):
    """Find all EFTA IDs from existing PDF files on disk."""
    ids_by_dataset = {}

    for ds_dir in sorted(DOWNLOADS_DIR.iterdir()):
        if not ds_dir.is_dir() or not ds_dir.name.startswith('DataSet'):
            continue
        ds_num = int(ds_dir.name.replace('DataSet ', ''))
        if datasets and ds_num not in datasets:
            continue

        efta_ids = []
        for pdf in sorted(ds_dir.glob('*.pdf')):
            efta_ids.append(pdf.stem)

        if efta_ids:
            ids_by_dataset[ds_num] = {
                'ids': efta_ids,
                'dir_name': ds_dir.name,
                'dir_path': str(ds_dir),
            }

    return ids_by_dataset


def load_progress():
    """Load scan progress for resume."""
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f)
    return {'datasets': {}, 'hits': [], 'total_probed': 0, 'total_hits': 0, 'total_errors': 0}


def save_progress(progress):
    """Save scan progress."""
    progress['last_updated'] = datetime.now(timezone.utc).isoformat()
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f, indent=2)


def probe_url(url, use_head=False, session=None):
    """Probe a URL and return status code."""
    try:
        if use_head:
            resp = session.head(url, timeout=15, allow_redirects=True)
        else:
            resp = session.get(url, timeout=15, stream=True)
            # Only read first few bytes to check if it's a real file
            if resp.status_code == 200:
                content = resp.content
                return resp.status_code, len(content)
            resp.close()
        return resp.status_code, 0
    except requests.exceptions.Timeout:
        return 'timeout', 0
    except requests.exceptions.ConnectionError:
        return 'connection_error', 0
    except Exception as e:
        return f'error:{str(e)[:50]}', 0


def run_scan(datasets=None, rate_limit=1.5, resume=False, use_head=False):
    """Run the extension scan."""
    ids_by_dataset = discover_efta_ids(datasets=datasets)
    progress = load_progress() if resume else {'datasets': {}, 'hits': [], 'total_probed': 0, 'total_hits': 0, 'total_errors': 0}

    total_ids = sum(len(d['ids']) for d in ids_by_dataset.values())
    logging.info(f'=== Extension Scan Starting ===')
    logging.info(f'Datasets: {sorted(ids_by_dataset.keys())}')
    logging.info(f'Total EFTA IDs to scan: {total_ids}')
    logging.info(f'Extensions per ID: {len(EXTENSIONS)}')
    logging.info(f'Total probes needed: {total_ids * len(EXTENSIONS)}')
    logging.info(f'Rate limit: {rate_limit}s between probes')
    logging.info(f'Method: {"HEAD" if use_head else "GET"}')
    logging.info(f'Resume: {resume}')

    # Setup session with cookies
    session = requests.Session()
    session.headers.update(HEADERS)
    if COOKIE_STRING:
        session.headers['Cookie'] = COOKIE_STRING

    results_file = open(RESULTS_FILE, 'a')

    try:
        for ds_num in sorted(ids_by_dataset.keys()):
            ds_info = ids_by_dataset[ds_num]
            ds_key = f'ds{ds_num}'
            dir_name = ds_info['dir_name']
            dir_path = ds_info['dir_path']
            efta_ids = ds_info['ids']

            # Resume: skip already-scanned IDs
            start_idx = 0
            if resume and ds_key in progress['datasets']:
                start_idx = progress['datasets'][ds_key].get('last_index', 0)
                logging.info(f'DS{ds_num}: Resuming from index {start_idx}/{len(efta_ids)}')

            if start_idx >= len(efta_ids):
                logging.info(f'DS{ds_num}: Already complete, skipping')
                continue

            logging.info(f'DS{ds_num}: Scanning {len(efta_ids) - start_idx} EFTA IDs for companion files')

            encoded_dataset = url_quote(dir_name)

            for idx in range(start_idx, len(efta_ids)):
                efta_id = efta_ids[idx]
                timestamp = datetime.now(timezone.utc).isoformat()

                for ext in EXTENSIONS:
                    filename = f'{efta_id}{ext}'
                    url = f'{DOJ_BASE_URL}/{encoded_dataset}/{filename}'

                    # Skip if file already exists on disk
                    local_path = Path(dir_path) / filename
                    if local_path.exists():
                        # Already have it — log as existing
                        entry = {
                            'timestamp': timestamp,
                            'efta_id': efta_id,
                            'dataset': f'DS{ds_num}',
                            'extension': ext,
                            'status': 'already_on_disk',
                            'action': 'skip',
                            'size_kb': round(local_path.stat().st_size / 1024, 2),
                        }
                        results_file.write(json.dumps(entry) + '\n')
                        progress['total_probed'] += 1
                        continue

                    # Probe URL
                    status_code, size = probe_url(url, use_head=use_head, session=session)

                    if status_code == 200:
                        # HIT! Download the file
                        action = 'downloaded'
                        try:
                            if use_head:
                                # Need to do a GET to actually download
                                resp = session.get(url, timeout=30)
                                content = resp.content
                            else:
                                # Already have content from probe
                                resp = session.get(url, timeout=30)
                                content = resp.content

                            with open(local_path, 'wb') as f:
                                f.write(content)
                            size_kb = len(content) / 1024
                            logging.info(f'*** HIT *** DS{ds_num}/{efta_id}{ext} — {size_kb:.1f} KB downloaded!')
                        except Exception as e:
                            action = 'download_failed'
                            size_kb = 0
                            logging.error(f'Download failed for {url}: {e}')

                        entry = {
                            'timestamp': timestamp,
                            'efta_id': efta_id,
                            'dataset': f'DS{ds_num}',
                            'extension': ext,
                            'status': 200,
                            'action': action,
                            'size_kb': round(size_kb, 2),
                            'output': str(local_path),
                        }
                        progress['total_hits'] += 1
                        progress['hits'].append({'efta_id': efta_id, 'ext': ext, 'dataset': f'DS{ds_num}'})

                    elif status_code == 404:
                        entry = {
                            'timestamp': timestamp,
                            'efta_id': efta_id,
                            'dataset': f'DS{ds_num}',
                            'extension': ext,
                            'status': 404,
                            'action': 'miss',
                        }

                    elif status_code == 403:
                        entry = {
                            'timestamp': timestamp,
                            'efta_id': efta_id,
                            'dataset': f'DS{ds_num}',
                            'extension': ext,
                            'status': 403,
                            'action': 'blocked',
                            'error': 'WAF/cookies expired — update COOKIE_STRING',
                        }
                        progress['total_errors'] += 1
                        logging.warning(f'403 Forbidden on {url} — cookies may need refresh')

                    elif status_code == 429:
                        entry = {
                            'timestamp': timestamp,
                            'efta_id': efta_id,
                            'dataset': f'DS{ds_num}',
                            'extension': ext,
                            'status': 429,
                            'action': 'rate_limited',
                            'error': 'Rate limited — backing off',
                        }
                        progress['total_errors'] += 1
                        logging.warning(f'429 Rate limited — backing off 30s')
                        time.sleep(30)

                    else:
                        entry = {
                            'timestamp': timestamp,
                            'efta_id': efta_id,
                            'dataset': f'DS{ds_num}',
                            'extension': ext,
                            'status': str(status_code),
                            'action': 'error',
                            'error': str(status_code),
                        }
                        progress['total_errors'] += 1

                    results_file.write(json.dumps(entry) + '\n')
                    progress['total_probed'] += 1

                    # Rate limit
                    time.sleep(rate_limit)

                # Update progress every ID
                progress['datasets'][ds_key] = {
                    'last_index': idx + 1,
                    'total_ids': len(efta_ids),
                }

                # Save progress every 50 IDs
                if (idx + 1) % 50 == 0:
                    save_progress(progress)
                    results_file.flush()
                    pct = ((idx + 1) / len(efta_ids)) * 100
                    logging.info(
                        f'DS{ds_num}: Progress {idx + 1}/{len(efta_ids)} ({pct:.1f}%) — '
                        f'{progress["total_hits"]} hits, {progress["total_errors"]} errors'
                    )

            # Mark dataset complete
            progress['datasets'][ds_key] = {
                'last_index': len(efta_ids),
                'total_ids': len(efta_ids),
                'complete': True,
            }
            save_progress(progress)
            logging.info(f'DS{ds_num}: Complete — {len(efta_ids)} IDs scanned')

    finally:
        results_file.close()
        save_progress(progress)

    logging.info('=== Extension Scan Complete ===')
    logging.info(f'Total probed: {progress["total_probed"]}')
    logging.info(f'Total hits: {progress["total_hits"]}')
    logging.info(f'Total errors: {progress["total_errors"]}')

    if progress['hits']:
        logging.info(f'Companion files found:')
        for hit in progress['hits']:
            logging.info(f'  {hit["dataset"]}/{hit["efta_id"]}{hit["ext"]}')


def print_report():
    """Print summary report from results file."""
    if not RESULTS_FILE.exists():
        print(f"No results file found at: {RESULTS_FILE}")
        print("Run the scan first: python scripts/scan-epstein-extensions.py")
        return

    counts = {
        'total_probes': 0,
        'by_status': {},
        'by_dataset': {},
        'by_extension': {},
        'hits': [],
    }

    with open(RESULTS_FILE, 'r') as f:
        for line in f:
            if not line.strip():
                continue
            entry = json.loads(line.strip())
            counts['total_probes'] += 1

            status = str(entry.get('status', 'unknown'))
            action = entry.get('action', 'unknown')
            dataset = entry.get('dataset', 'unknown')
            ext = entry.get('extension', 'unknown')

            key = f'{status}_{action}'
            counts['by_status'][key] = counts['by_status'].get(key, 0) + 1
            counts['by_dataset'][dataset] = counts['by_dataset'].get(dataset, 0) + 1
            counts['by_extension'][ext] = counts['by_extension'].get(ext, 0) + 1

            if action == 'downloaded':
                counts['hits'].append(entry)

    print("\n=== Extension Scan Report ===")
    print(f"Total probes: {counts['total_probes']}")

    print(f"\nBy status/action:")
    for key, count in sorted(counts['by_status'].items(), key=lambda x: -x[1]):
        print(f"  {key}: {count}")

    print(f"\nBy dataset:")
    for ds, count in sorted(counts['by_dataset'].items()):
        print(f"  {ds}: {count} probes")

    print(f"\nBy extension:")
    for ext, count in sorted(counts['by_extension'].items(), key=lambda x: -x[1]):
        print(f"  {ext}: {count} probes")

    if counts['hits']:
        print(f"\n*** COMPANION FILES FOUND ({len(counts['hits'])}) ***")
        for hit in counts['hits']:
            print(f"  {hit['dataset']}/{hit['efta_id']}{hit['extension']} — {hit.get('size_kb', 0)} KB")
    else:
        print(f"\nNo companion files found yet.")

    # Load progress for estimate
    progress = load_progress()
    if progress.get('datasets'):
        print(f"\nProgress by dataset:")
        for ds_key, ds_progress in sorted(progress['datasets'].items()):
            last = ds_progress.get('last_index', 0)
            total = ds_progress.get('total_ids', 0)
            complete = ds_progress.get('complete', False)
            status = '✅' if complete else f'{last}/{total} ({last/total*100:.1f}%)'
            print(f"  {ds_key}: {status}")

    print()


def main():
    parser = argparse.ArgumentParser(description='Scan DOJ URLs for companion files at known EFTA IDs')
    parser.add_argument('--datasets', type=str, default=None, help='Comma-separated dataset numbers')
    parser.add_argument('--rate-limit', type=float, default=1.5, help='Seconds between probes (default: 1.5)')
    parser.add_argument('--resume', action='store_true', help='Resume from last checkpoint')
    parser.add_argument('--use-head', action='store_true', help='Use HEAD requests (faster but less reliable)')
    parser.add_argument('--report', action='store_true', help='Print summary report')
    args = parser.parse_args()

    setup_logging()

    if args.report:
        print_report()
        return

    datasets = None
    if args.datasets:
        datasets = [int(d.strip()) for d in args.datasets.split(',')]

    run_scan(
        datasets=datasets,
        rate_limit=args.rate_limit,
        resume=args.resume,
        use_head=args.use_head,
    )


if __name__ == '__main__':
    main()

