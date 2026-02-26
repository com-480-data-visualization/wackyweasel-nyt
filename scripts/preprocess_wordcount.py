#!/usr/bin/env python3
"""
Country Word Count Preprocessing
==================================

Computes average NYT article word count per country.
Uses glocations keyword tags for country extraction (fast dict lookup).

Output: src/data/processed/country_wordcount.json

Usage:
    python preprocess_wordcount.py
"""

import sqlite3
import json
import re
import time
from collections import defaultdict
from pathlib import Path
import sys

from preprocess_countries import COUNTRY_ALIASES

DB_FILE = Path("src/data/nyt.db")
OUTPUT_FILE = Path("src/data/processed/country_wordcount.json")

# ISO3 -> canonical country name (from tile grid)
GRID_FILE = Path("src/data/processed/world_tile_grid.json")

# Regex to extract parenthetical country: "Kobe (Japan)" -> "Japan"
_parens_re = re.compile(r'\(([^)]+)\)')


def extract_countries_from_glocations(keywords_str):
    """Extract ISO3 country codes from glocations keyword tags."""
    if not keywords_str:
        return set()

    try:
        keywords = json.loads(keywords_str.replace("'", '"'))
    except (json.JSONDecodeError, ValueError):
        return set()

    found = set()
    for kw in keywords:
        if not isinstance(kw, dict) or kw.get('name') != 'glocations':
            continue

        value = kw.get('value', '').strip()
        if not value:
            continue

        lookup = value.lower()
        if lookup in COUNTRY_ALIASES:
            found.add(COUNTRY_ALIASES[lookup][0])
            continue

        m = _parens_re.search(value)
        if m:
            inner = m.group(1).strip().lower()
            if inner in COUNTRY_ALIASES:
                found.add(COUNTRY_ALIASES[inner][0])

    return found


def main():
    if not DB_FILE.exists():
        print(f"Database not found: {DB_FILE}")
        print("Run csv_to_sqlite.py first to create the database.")
        sys.exit(1)

    # Load grid for canonical country names
    iso3_to_name = {}
    if GRID_FILE.exists():
        grid = json.loads(GRID_FILE.read_text())
        for entry in grid:
            iso3_to_name[entry['alpha-3']] = entry['name']

    log = lambda msg='': print(msg, flush=True)

    log("=" * 60)
    log("COUNTRY WORD COUNT EXTRACTION (glocations)")
    log("=" * 60)
    log()

    t0 = time.time()

    conn = sqlite3.connect(str(DB_FILE))
    log("Connected to database, querying articles...")
    cursor = conn.execute(
        "SELECT keywords, word_count FROM articles "
        "WHERE word_count > 0 AND keywords LIKE '%glocations%'"
    )
    log(f"Query started ({time.time() - t0:.1f}s)")

    # Per-country accumulators
    country_sum = defaultdict(float)
    country_count = defaultdict(int)
    total = 0
    matched = 0

    for row in cursor:
        keywords_str, word_count = row
        total += 1

        countries = extract_countries_from_glocations(keywords_str)
        if not countries:
            continue

        matched += 1

        for iso3 in countries:
            country_sum[iso3] += word_count
            country_count[iso3] += 1

        if total % 100000 == 0:
            elapsed = time.time() - t0
            log(f"  {total:>1,} articles | {matched:,} matched | {elapsed:.0f}s elapsed")

    conn.close()
    elapsed = time.time() - t0

    log()
    log(f"Total articles with glocations: {total:,}")
    log(f"Articles matched to countries: {matched:,} ({matched/total*100:.1f}%)")
    log(f"Countries found: {len(country_count)}")
    log(f"Time: {elapsed:.1f}s")

    # Build output
    countries = []
    for iso3 in sorted(country_count.keys()):
        avg = country_sum[iso3] / country_count[iso3]
        name = iso3_to_name.get(iso3, iso3)
        countries.append({
            "id": iso3,
            "name": name,
            "avg_word_count": round(avg, 1),
            "article_count": country_count[iso3],
        })

    output = {"countries": countries}

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f, indent=2)

    log(f"\nOutput: {OUTPUT_FILE}")
    log(f"\nTop 20 by article count:")
    for c in sorted(countries, key=lambda x: x["article_count"], reverse=True)[:20]:
        log(f"  {c['name']:30s}  avg {c['avg_word_count']:7.1f} words  ({c['article_count']:,} articles)")

    log(f"\n{'=' * 60}")
    log(f"DONE! ({elapsed:.1f}s)")
    log(f"{'=' * 60}")


if __name__ == '__main__':
    main()
