#!/usr/bin/env python3
"""
NYT Articles Dataset Preprocessing Script
==========================================

Processes NYT articles from SQLite database to extract word frequencies
over time for use in D3.js visualizations.

Usage:
    python preprocess.py --event 911 --words "terrorism,war,attack"
    python preprocess.py --start-date 2020-01-01 --end-date 2021-12-31 --words "covid,pandemic"
    python preprocess.py --full --words "election,climate"
"""

import sqlite3
import json
import re
from collections import defaultdict, Counter
import argparse
from pathlib import Path
import sys

# Configuration
DATA_DIR = Path("src/data")
OUTPUT_DIR = Path("src/data/processed")
DB_FILE = DATA_DIR / "nyt.db"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

STOP_WORDS = set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has',
    'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was',
    'will', 'with', 'the', 'this', 'but', 'they', 'have', 'had', 'what',
    'when', 'where', 'who', 'which', 'why', 'how', 'all', 'each', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 'can', 'just', 'should', 'now', 'also', 'been', 'being',
    'both', 'could', 'did', 'does', 'doing', 'during', 'if', 'into', 'may',
    'might', 'more', 'most', 'must', 'shall', 'should', 'would', 'their',
    'them', 'then', 'there', 'these', 'those', 'through', 'under', 'up',
    'out', 'over', 'said', 'say', 'says', 'new', 'york', 'times'
])


def clean_text(text):
    if not text:
        return ""
    text = str(text).lower()
    text = re.sub(r'[^a-z\s]', ' ', text)
    return ' '.join(text.split())


def extract_words(text, min_length=3):
    if not text:
        return []
    words = clean_text(text).split()
    return [w for w in words if w not in STOP_WORDS and len(w) >= min_length]


def parse_headline(headline_str):
    if not headline_str:
        return ""
    try:
        headline = json.loads(headline_str.replace("'", '"'))
        return headline.get('main', '')
    except:
        return ""


def parse_keywords(keywords_str):
    if not keywords_str:
        return []
    try:
        keywords = json.loads(keywords_str.replace("'", '"'))
        return [kw.get('value', '') for kw in keywords if isinstance(kw, dict)]
    except:
        return []


def process_articles(db_path, date_range=None, word_filter=None):
    """Query SQLite and extract word counts by date."""
    conn = sqlite3.connect(str(db_path))

    # Build query with date filtering
    query = "SELECT pub_date_parsed, headline, abstract, snippet, keywords FROM articles"
    params = []

    if date_range:
        query += " WHERE pub_date_parsed >= ? AND pub_date_parsed <= ?"
        params = [date_range[0], date_range[1]]

    query += " ORDER BY pub_date_parsed"

    if word_filter:
        word_filter = set(w.lower() for w in word_filter)

    print(f"Querying database: {db_path}")
    if date_range:
        print(f"Date range: {date_range[0]} to {date_range[1]}")
    print(f"Word filter: {word_filter if word_filter else 'All words'}")
    print("-" * 60)

    cursor = conn.execute(query, params)

    date_word_counts = defaultdict(Counter)
    total = 0
    matched = 0

    for row in cursor:
        pub_date, headline_str, abstract, snippet, keywords_str = row

        if not pub_date:
            continue

        total += 1

        headline = parse_headline(headline_str)
        abstract = abstract or ""
        snippet = snippet or ""
        keywords = parse_keywords(keywords_str)

        combined = f"{headline} {abstract} {snippet} {' '.join(keywords)}"
        words = extract_words(combined)

        if word_filter:
            words = [w for w in words if w in word_filter]

        if words:
            matched += 1
            date_word_counts[pub_date].update(words)

        if total % 100000 == 0:
            print(f"  Processed {total:,} articles, {matched:,} with matches...", flush=True)

    conn.close()

    print(f"\nTotal articles queried: {total:,}")
    print(f"Articles with word matches: {matched:,}")
    print(f"Unique dates: {len(date_word_counts):,}")

    return date_word_counts


def export_word_timeseries(date_counts, word, output_file):
    timeseries = []
    for date in sorted(date_counts.keys()):
        count = date_counts[date].get(word, 0)
        if count > 0:
            timeseries.append({'date': date, 'count': count})

    with open(output_file, 'w') as f:
        json.dump(timeseries, f, indent=2)

    print(f"  {word}: {len(timeseries)} data points -> {output_file}")


def export_top_words(date_counts, top_n=100, output_file=None):
    if output_file is None:
        output_file = OUTPUT_DIR / "top_words.json"

    total_word_counts = Counter()
    for date, word_counts in date_counts.items():
        total_word_counts.update(word_counts)

    top_words = [
        {'word': word, 'total_count': count}
        for word, count in total_word_counts.most_common(top_n)
    ]

    with open(output_file, 'w') as f:
        json.dump(top_words, f, indent=2)

    print(f"\nTop 20 words:")
    for i, item in enumerate(top_words[:20], 1):
        print(f"  {i:2d}. {item['word']:20s} - {item['total_count']:,}")

    return top_words


def export_all_data(date_counts, output_file=None):
    if output_file is None:
        output_file = OUTPUT_DIR / "word_counts_by_date.json"

    data = {
        date: dict(word_counts)
        for date, word_counts in sorted(date_counts.items())
    }

    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Exported complete dataset to {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description='Preprocess NYT articles for word frequency analysis'
    )
    parser.add_argument('--words', type=str, default=None,
                        help='Comma-separated words to track')
    parser.add_argument('--top-n', type=int, default=100,
                        help='Number of top words to export')
    parser.add_argument('--start-date', type=str, default=None,
                        help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end-date', type=str, default=None,
                        help='End date (YYYY-MM-DD)')
    parser.add_argument('--event', type=str, default=None,
                        help='Predefined event: 911, ukraine, financial_crisis, covid, obama, trump')
    parser.add_argument('--full', action='store_true',
                        help='Process entire dataset (no date filter)')

    args = parser.parse_args()

    if not DB_FILE.exists():
        print(f"Database not found: {DB_FILE}")
        print("Run csv_to_sqlite.py first to create the database.")
        sys.exit(1)

    # Handle predefined events
    date_range = None
    event_output_dir = OUTPUT_DIR
    if args.event:
        events = {
            '911': ('2001-01-01', '2002-12-31'),
            'ukraine': ('2022-01-01', '2023-12-31'),
            'financial_crisis': ('2008-01-01', '2009-12-31'),
            'covid': ('2020-01-01', '2021-12-31'),
            'obama': ('2008-01-01', '2012-12-31'),
            'trump': ('2016-01-01', '2020-12-31'),
            'trump1': ('2016-01-01', '2021-01-20'),
            'trump2': ('2024-01-01', '2025-05-01'),
        }
        if args.event in events:
            date_range = events[args.event]
            event_output_dir = OUTPUT_DIR / "events" / args.event
            event_output_dir.mkdir(parents=True, exist_ok=True)
            print(f"Event: {args.event}")
            print(f"Output: {event_output_dir}")
        else:
            print(f"Unknown event: {args.event}")
            print(f"Available: {', '.join(events.keys())}")
            sys.exit(1)
    elif args.start_date and args.end_date:
        date_range = (args.start_date, args.end_date)
    elif args.start_date or args.end_date:
        print("Error: Both --start-date and --end-date required")
        sys.exit(1)

    word_filter = None
    if args.words:
        word_filter = [w.strip() for w in args.words.split(',')]

    print(f"\n{'='*60}")
    print("NYT ARTICLES PREPROCESSING (SQLite)")
    print(f"{'='*60}\n")

    date_counts = process_articles(DB_FILE, date_range=date_range, word_filter=word_filter)

    print(f"\n{'='*60}")
    print("EXPORTING RESULTS")
    print(f"{'='*60}\n")

    top_words = export_top_words(date_counts, top_n=args.top_n,
                                 output_file=event_output_dir / "top_words.json")

    if word_filter:
        print(f"\nExporting time series:")
        for word in word_filter:
            output_file = event_output_dir / f"timeseries_{word}.json"
            export_word_timeseries(date_counts, word, output_file)
    else:
        print(f"\nExporting time series for top 10:")
        for item in top_words[:10]:
            word = item['word']
            output_file = event_output_dir / f"timeseries_{word}.json"
            export_word_timeseries(date_counts, word, output_file)

    export_all_data(date_counts, output_file=event_output_dir / "word_counts_by_date.json")

    print(f"\n{'='*60}")
    print("DONE!")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
