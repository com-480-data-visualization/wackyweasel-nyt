#!/usr/bin/env python3
"""
Front Page Headlines by Country
================================

Extracts ~10 random front page headlines per country per year from the NYT DB.
Used for typewriter tooltip animation in the "By Year" map view.

Output: src/data/processed/front_page_headlines.json

Usage:
    python preprocess_headlines.py
"""

import sqlite3
import json
import random
from collections import defaultdict
from pathlib import Path
import ast

from preprocess_countries import COUNTRY_ALIASES, extract_countries

DB_FILE = Path("src/data/nyt.db")
OUTPUT_FILE = Path("src/data/processed/front_page_headlines.json")

HEADLINES_PER_COUNTRY_YEAR = 10
YEARS = range(2000, 2024)


def classify_section(print_section, print_page):
    """Return 'Front Page' if article was on page A1."""
    if not print_section or not print_page:
        return None
    try:
        if print_section.strip() == 'A' and float(print_page) == 1.0:
            return 'Front Page'
    except (ValueError, TypeError):
        pass
    return None


def main():
    conn = sqlite3.connect(str(DB_FILE))
    cursor = conn.execute(
        "SELECT pub_date_parsed, headline, print_section, print_page "
        "FROM articles "
        "WHERE pub_date_parsed IS NOT NULL "
        "AND print_section IS NOT NULL "
        "AND print_page IS NOT NULL "
        "ORDER BY pub_date_parsed"
    )

    # {iso3: {year: [headline, ...]}}
    headlines = defaultdict(lambda: defaultdict(list))
    iso3_to_name = {}

    count = 0
    front_page_count = 0

    for row in cursor:
        pub_date, headline, print_section, print_page = row
        if not headline:
            continue

        year = int(pub_date[:4])
        if year < 2000 or year > 2023:
            continue

        count += 1
        if count % 500000 == 0:
            print(f"  Processed {count:,} articles...")

        section = classify_section(print_section, print_page)
        if section != 'Front Page':
            continue

        front_page_count += 1

        # Extract plain text headline from JSON-like dict
        main_headline = headline
        if isinstance(headline, str) and headline.startswith('{'):
            try:
                h = json.loads(headline.replace("'", '"').replace('None', 'null'))
                main_headline = h.get('main', headline)
            except (json.JSONDecodeError, ValueError):
                try:
                    h = ast.literal_eval(headline)
                    main_headline = h.get('main', headline) if isinstance(h, dict) else headline
                except (ValueError, SyntaxError):
                    pass

        if not main_headline or not isinstance(main_headline, str):
            continue

        # Title-case headlines that are ALL CAPS
        if main_headline == main_headline.upper() and len(main_headline) > 10:
            main_headline = main_headline.title()

        countries = extract_countries(main_headline)
        for iso3 in countries:
            headlines[iso3][year].append(main_headline)
            if iso3 not in iso3_to_name:
                for alias, (code, name) in COUNTRY_ALIASES.items():
                    if code == iso3:
                        iso3_to_name[iso3] = name
                        break

    conn.close()
    print(f"Total articles scanned: {count:,}")
    print(f"Front page articles: {front_page_count:,}")
    print(f"Countries with headlines: {len(headlines)}")

    # Sample up to N headlines per country-year, seed for reproducibility
    random.seed(42)
    output = {}
    for iso3, by_year in headlines.items():
        year_dict = {}
        for year in YEARS:
            pool = by_year.get(year, [])
            if not pool:
                continue
            sample = random.sample(pool, min(HEADLINES_PER_COUNTRY_YEAR, len(pool)))
            year_dict[str(year)] = sample
        if year_dict:
            output[iso3] = year_dict

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f)

    size_kb = OUTPUT_FILE.stat().st_size / 1024
    print(f"Written {OUTPUT_FILE} ({size_kb:.0f} KB)")
    print(f"Countries: {len(output)}")


if __name__ == '__main__':
    main()
