#!/usr/bin/env python3
"""
search-epstein-db.py - Query the parsed Epstein files database.

Usage:
    python scripts/search-epstein-db.py --search "FBI"           # Full-text search
    python scripts/search-epstein-db.py --stats                   # Show database statistics
    python scripts/search-epstein-db.py --export results.json     # Export all records
    python scripts/search-epstein-db.py --list-documents          # List all documents with text
"""

import argparse
import json
import sqlite3
import sys
from pathlib import Path

DB_FILE = Path(__file__).parent.parent / 'downloads' / 'epstein' / 'parsed' / 'epstein.db'


def get_conn():
    if not DB_FILE.exists():
        print(f'Database not found: {DB_FILE}')
        print('Run parse-epstein-pdfs.py first.')
        sys.exit(1)
    return sqlite3.connect(str(DB_FILE))


def show_stats():
    conn = get_conn()
    c = conn.cursor()

    c.execute('SELECT COUNT(*) FROM files')
    total = c.fetchone()[0]

    c.execute('SELECT classification, COUNT(*) FROM files GROUP BY classification')
    by_class = dict(c.fetchall())

    c.execute('SELECT source_type, COUNT(*) FROM files GROUP BY source_type')
    by_source = dict(c.fetchall())

    c.execute('SELECT dataset_num, COUNT(*) FROM files WHERE source_type="doj" GROUP BY dataset_num')
    by_dataset = dict(c.fetchall())

    c.execute('SELECT COUNT(*) FROM files WHERE ocr_text IS NOT NULL AND ocr_text != ""')
    has_text = c.fetchone()[0]

    c.execute('SELECT AVG(ocr_confidence) FROM files WHERE ocr_confidence > 0')
    avg_conf = c.fetchone()[0] or 0

    c.execute('SELECT COUNT(*) FROM files WHERE error != ""')
    errors = c.fetchone()[0]

    print(f'=== Epstein Files Database Stats ===')
    print(f'Total files: {total}')
    print(f'With OCR text: {has_text} ({has_text/total*100:.1f}%)' if total > 0 else '')
    print(f'Avg OCR confidence: {avg_conf:.1f}%')
    print(f'Errors: {errors}')
    print(f'\nBy classification: {json.dumps(by_class, indent=2)}')
    print(f'By source: {json.dumps(by_source, indent=2)}')
    print(f'By dataset: {json.dumps({f"DS{k}": v for k, v in sorted(by_dataset.items())}, indent=2)}')
    conn.close()


def search(query, limit=20):
    conn = get_conn()
    c = conn.cursor()

    c.execute('''SELECT f.efta_id, f.source_type, f.dataset_num, f.classification,
                        f.ocr_confidence, substr(f.ocr_text, 1, 200), f.source_path
                 FROM files_fts ft
                 JOIN files f ON f.id = ft.rowid
                 WHERE files_fts MATCH ?
                 ORDER BY rank
                 LIMIT ?''', (query, limit))

    results = c.fetchall()
    if not results:
        print(f'No results for: {query}')
    else:
        print(f'=== Search: "{query}" ({len(results)} results) ===')
        for r in results:
            efta_id, src, ds, cls, conf, text, path = r
            print(f'\n  {efta_id} [{src} DS{ds}] ({cls}, {conf}% conf)')
            print(f'  Text: {text}...' if text else '  [no text]')

    conn.close()


def list_documents(limit=50):
    conn = get_conn()
    c = conn.cursor()

    c.execute('''SELECT efta_id, dataset_num, ocr_confidence, length(ocr_text), substr(ocr_text, 1, 100)
                 FROM files
                 WHERE classification IN ('document', 'handwritten')
                   AND ocr_text IS NOT NULL AND ocr_text != ''
                 ORDER BY ocr_confidence DESC
                 LIMIT ?''', (limit,))

    results = c.fetchall()
    print(f'=== Top {len(results)} Documents with OCR Text ===')
    for r in results:
        efta_id, ds, conf, text_len, preview = r
        print(f'  {efta_id} [DS{ds}] {conf}% conf, {text_len} chars: {preview}...')

    conn.close()


def export_results(output_path):
    conn = get_conn()
    c = conn.cursor()

    c.execute('SELECT * FROM files ORDER BY efta_id')
    columns = [desc[0] for desc in c.description]
    results = [dict(zip(columns, row)) for row in c.fetchall()]

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f'Exported {len(results)} records to {output_path}')
    conn.close()


def main():
    parser = argparse.ArgumentParser(description='Search Epstein files database')
    parser.add_argument('--search', type=str, help='Full-text search query')
    parser.add_argument('--stats', action='store_true', help='Show database statistics')
    parser.add_argument('--list-documents', action='store_true', help='List documents with OCR text')
    parser.add_argument('--export', type=str, help='Export to JSON file')
    parser.add_argument('--limit', type=int, default=20, help='Max results')
    args = parser.parse_args()

    if args.stats:
        show_stats()
    elif args.search:
        search(args.search, args.limit)
    elif args.list_documents:
        list_documents(args.limit)
    elif args.export:
        export_results(args.export)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()

