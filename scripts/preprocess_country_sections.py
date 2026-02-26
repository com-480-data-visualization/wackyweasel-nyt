#!/usr/bin/env python3
"""
Country Mentions by Section/Importance
=======================================

Extracts country mentions broken down by NYT section importance:
- Front Page (print_section='A', print_page=1)
- World section
- Business section
- Opinion section
- All other sections

Output: src/data/processed/country_sections.json

Usage:
    python preprocess_country_sections.py
"""

import sqlite3
import json
import re
from collections import defaultdict
from pathlib import Path
import sys

DB_FILE = Path("src/data/nyt.db")
OUTPUT_FILE = Path("src/data/processed/country_sections.json")

# Import country extraction from existing script
from preprocess_countries import COUNTRY_ALIASES, extract_countries

# Section categories
def classify_section(section_name, print_section, print_page):
    """Classify article into importance tier."""
    # Front page: Section A, Page 1
    try:
        if print_section == 'A' and float(print_page) == 1.0:
            return 'Front Page'
    except (ValueError, TypeError):
        pass

    if not section_name:
        return 'Other'

    s = section_name.strip()
    if s == 'World':
        return 'World'
    elif s in ('Business Day', 'Business'):
        return 'Business'
    elif s == 'Opinion':
        return 'Opinion'
    elif s in ('U.S.', 'Washington'):
        return 'U.S.'
    else:
        return 'Other'


SECTIONS = ['Front Page', 'World', 'U.S.', 'Business', 'Opinion', 'Other']


def main():
    if not DB_FILE.exists():
        print(f"Database not found: {DB_FILE}")
        sys.exit(1)

    print("=" * 60)
    print("COUNTRY MENTIONS BY SECTION")
    print("=" * 60)
    print()

    conn = sqlite3.connect(str(DB_FILE))
    cursor = conn.execute(
        "SELECT pub_date_parsed, abstract, snippet, keywords, "
        "section_name, print_section, print_page FROM articles "
        "WHERE pub_date_parsed IS NOT NULL "
        "ORDER BY pub_date_parsed"
    )

    # {iso3: {section: {year: count}}}
    counts = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    total = 0
    matched = 0

    for row in cursor:
        pub_date, abstract, snippet, keywords_str, section_name, print_section, print_page = row

        if not pub_date or len(pub_date) < 4:
            continue

        total += 1
        try:
            year = int(pub_date[:4])
        except ValueError:
            continue

        if year < 2000 or year > 2025:
            continue

        # Combine text fields
        text_parts = []
        if abstract:
            text_parts.append(abstract)
        if snippet:
            text_parts.append(snippet)
        if keywords_str:
            try:
                keywords = json.loads(keywords_str.replace("'", '"'))
                for kw in keywords:
                    if isinstance(kw, dict):
                        text_parts.append(kw.get('value', ''))
            except (json.JSONDecodeError, ValueError):
                pass

        combined = ' '.join(text_parts)
        countries = extract_countries(combined)

        if countries:
            matched += 1
            section = classify_section(section_name, print_section, print_page)
            for iso3 in countries:
                counts[iso3][section][year] += 1

        if total % 200000 == 0:
            print(f"  Processed {total:,} articles, {matched:,} with country mentions...",
                  flush=True)

    conn.close()

    print(f"\nTotal articles: {total:,}")
    print(f"Articles with country mentions: {matched:,}")

    # Build output
    years = list(range(2000, 2026))

    # Name lookup
    iso3_to_name = {}
    for alias, (iso3, name) in COUNTRY_ALIASES.items():
        iso3_to_name[iso3] = name

    countries = []
    for iso3 in sorted(counts.keys()):
        by_section = {}
        for section in SECTIONS:
            by_section[section] = [counts[iso3][section].get(y, 0) for y in years]
        countries.append({
            "id": iso3,
            "name": iso3_to_name.get(iso3, iso3),
            "by_section": by_section
        })

    # Sort by total front page mentions descending
    countries.sort(
        key=lambda c: sum(c["by_section"]["Front Page"]),
        reverse=True
    )

    output = {
        "years": years,
        "sections": SECTIONS,
        "countries": countries
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\nOutput: {OUTPUT_FILE}")

    print(f"\nTop 15 countries by Front Page mentions:")
    for i, c in enumerate(countries[:15], 1):
        fp = sum(c["by_section"]["Front Page"])
        total_all = sum(sum(c["by_section"][s]) for s in SECTIONS)
        pct = (fp / total_all * 100) if total_all > 0 else 0
        print(f"  {i:2d}. {c['id']} ({c['name']:25s}) — {fp:,} front page ({pct:.1f}% of total)")

    print(f"\n{'=' * 60}")
    print("DONE!")
    print(f"{'=' * 60}")


if __name__ == '__main__':
    main()
