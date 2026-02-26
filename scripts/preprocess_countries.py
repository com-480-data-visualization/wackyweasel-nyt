#!/usr/bin/env python3
"""
Country Mentions Preprocessing
==============================

Extracts country mentions from NYT articles (abstract + snippet + keywords)
using a dictionary-based approach. Aggregates counts by ISO3 code and year.

Output: src/data/processed/country_mentions.json

Usage:
    python preprocess_countries.py
"""

import sqlite3
import json
import re
from collections import defaultdict, Counter
from pathlib import Path
import sys

DB_FILE = Path("src/data/nyt.db")
OUTPUT_FILE = Path("src/data/processed/country_mentions.json")
COOCCURRENCE_FILE = Path("src/data/processed/country_cooccurrence.json")

# Country dictionary: maps name/alias -> (ISO3, display name)
# Covers ~200 countries + common aliases used in NYT articles
COUNTRY_ALIASES = {
    # North America
    "united states": ("USA", "United States"),
    "u.s.": ("USA", "United States"),
    "u.s.a.": ("USA", "United States"),
    "america": ("USA", "United States"),
    "american": ("USA", "United States"),
    "canada": ("CAN", "Canada"),
    "canadian": ("CAN", "Canada"),
    "mexico": ("MEX", "Mexico"),
    "mexican": ("MEX", "Mexico"),

    # Central America & Caribbean
    "guatemala": ("GTM", "Guatemala"),
    "honduras": ("HND", "Honduras"),
    "el salvador": ("SLV", "El Salvador"),
    "nicaragua": ("NIC", "Nicaragua"),
    "costa rica": ("CRI", "Costa Rica"),
    "panama": ("PAN", "Panama"),
    "cuba": ("CUB", "Cuba"),
    "cuban": ("CUB", "Cuba"),
    "haiti": ("HTI", "Haiti"),
    "haitian": ("HTI", "Haiti"),
    "dominican republic": ("DOM", "Dominican Republic"),
    "jamaica": ("JAM", "Jamaica"),
    "puerto rico": ("PRI", "Puerto Rico"),
    "trinidad and tobago": ("TTO", "Trinidad and Tobago"),

    # South America
    "brazil": ("BRA", "Brazil"),
    "brazilian": ("BRA", "Brazil"),
    "argentina": ("ARG", "Argentina"),
    "colombian": ("COL", "Colombia"),
    "colombia": ("COL", "Colombia"),
    "venezuela": ("VEN", "Venezuela"),
    "venezuelan": ("VEN", "Venezuela"),
    "peru": ("PER", "Peru"),
    "chile": ("CHL", "Chile"),
    "chilean": ("CHL", "Chile"),
    "ecuador": ("ECU", "Ecuador"),
    "bolivia": ("BOL", "Bolivia"),
    "paraguay": ("PRY", "Paraguay"),
    "uruguay": ("URY", "Uruguay"),

    # Western Europe
    "united kingdom": ("GBR", "United Kingdom"),
    "britain": ("GBR", "United Kingdom"),
    "british": ("GBR", "United Kingdom"),
    "england": ("GBR", "United Kingdom"),
    "scotland": ("GBR", "United Kingdom"),
    "wales": ("GBR", "United Kingdom"),
    "france": ("FRA", "France"),
    "french": ("FRA", "France"),
    "germany": ("DEU", "Germany"),
    "german": ("DEU", "Germany"),
    "italy": ("ITA", "Italy"),
    "italian": ("ITA", "Italy"),
    "spain": ("ESP", "Spain"),
    "spanish": ("ESP", "Spain"),
    "portugal": ("PRT", "Portugal"),
    "netherlands": ("NLD", "Netherlands"),
    "dutch": ("NLD", "Netherlands"),
    "belgium": ("BEL", "Belgium"),
    "belgian": ("BEL", "Belgium"),
    "switzerland": ("CHE", "Switzerland"),
    "swiss": ("CHE", "Switzerland"),
    "austria": ("AUT", "Austria"),
    "austrian": ("AUT", "Austria"),
    "ireland": ("IRL", "Ireland"),
    "irish": ("IRL", "Ireland"),
    "luxembourg": ("LUX", "Luxembourg"),

    # Northern Europe
    "sweden": ("SWE", "Sweden"),
    "swedish": ("SWE", "Sweden"),
    "norway": ("NOR", "Norway"),
    "norwegian": ("NOR", "Norway"),
    "denmark": ("DNK", "Denmark"),
    "danish": ("DNK", "Denmark"),
    "finland": ("FIN", "Finland"),
    "finnish": ("FIN", "Finland"),
    "iceland": ("ISL", "Iceland"),

    # Eastern Europe
    "russia": ("RUS", "Russia"),
    "russian": ("RUS", "Russia"),
    "ukraine": ("UKR", "Ukraine"),
    "ukrainian": ("UKR", "Ukraine"),
    "poland": ("POL", "Poland"),
    "polish": ("POL", "Poland"),
    "czech republic": ("CZE", "Czech Republic"),
    "czechia": ("CZE", "Czech Republic"),
    "slovakia": ("SVK", "Slovakia"),
    "hungary": ("HUN", "Hungary"),
    "hungarian": ("HUN", "Hungary"),
    "romania": ("ROU", "Romania"),
    "romanian": ("ROU", "Romania"),
    "bulgaria": ("BGR", "Bulgaria"),
    "croatia": ("HRV", "Croatia"),
    "serbian": ("SRB", "Serbia"),
    "serbia": ("SRB", "Serbia"),
    "bosnia": ("BIH", "Bosnia and Herzegovina"),
    "kosovo": ("XKX", "Kosovo"),
    "albania": ("ALB", "Albania"),
    "north macedonia": ("MKD", "North Macedonia"),
    "macedonia": ("MKD", "North Macedonia"),
    "montenegro": ("MNE", "Montenegro"),
    "slovenia": ("SVN", "Slovenia"),
    "estonia": ("EST", "Estonia"),
    "latvia": ("LVA", "Latvia"),
    "lithuania": ("LTU", "Lithuania"),
    "belarus": ("BLR", "Belarus"),
    "belarusian": ("BLR", "Belarus"),
    "moldova": ("MDA", "Moldova"),
    "georgia": ("GEO", "Georgia"),
    "georgian": ("GEO", "Georgia"),
    "armenia": ("ARM", "Armenia"),
    "azerbaijan": ("AZE", "Azerbaijan"),

    # Middle East
    "iraq": ("IRQ", "Iraq"),
    "iraqi": ("IRQ", "Iraq"),
    "iran": ("IRN", "Iran"),
    "iranian": ("IRN", "Iran"),
    "israel": ("ISR", "Israel"),
    "israeli": ("ISR", "Israel"),
    "palestine": ("PSE", "Palestine"),
    "palestinian": ("PSE", "Palestine"),
    "saudi arabia": ("SAU", "Saudi Arabia"),
    "saudi": ("SAU", "Saudi Arabia"),
    "yemen": ("YEM", "Yemen"),
    "yemeni": ("YEM", "Yemen"),
    "syria": ("SYR", "Syria"),
    "syrian": ("SYR", "Syria"),
    "jordan": ("JOR", "Jordan"),
    "jordanian": ("JOR", "Jordan"),
    "lebanon": ("LBN", "Lebanon"),
    "lebanese": ("LBN", "Lebanon"),
    "kuwait": ("KWT", "Kuwait"),
    "bahrain": ("BHR", "Bahrain"),
    "qatar": ("QAT", "Qatar"),
    "united arab emirates": ("ARE", "United Arab Emirates"),
    "u.a.e.": ("ARE", "United Arab Emirates"),
    "oman": ("OMN", "Oman"),
    "turkey": ("TUR", "Turkey"),
    "turkish": ("TUR", "Turkey"),
    "cyprus": ("CYP", "Cyprus"),

    # Central Asia
    "kazakhstan": ("KAZ", "Kazakhstan"),
    "uzbekistan": ("UZB", "Uzbekistan"),
    "turkmenistan": ("TKM", "Turkmenistan"),
    "tajikistan": ("TJK", "Tajikistan"),
    "kyrgyzstan": ("KGZ", "Kyrgyzstan"),

    # South Asia
    "india": ("IND", "India"),
    "indian": ("IND", "India"),
    "pakistan": ("PAK", "Pakistan"),
    "pakistani": ("PAK", "Pakistan"),
    "bangladesh": ("BGD", "Bangladesh"),
    "sri lanka": ("LKA", "Sri Lanka"),
    "nepal": ("NPL", "Nepal"),
    "afghanistan": ("AFG", "Afghanistan"),
    "afghan": ("AFG", "Afghanistan"),

    # East Asia
    "china": ("CHN", "China"),
    "chinese": ("CHN", "China"),
    "japan": ("JPN", "Japan"),
    "japanese": ("JPN", "Japan"),
    "south korea": ("KOR", "South Korea"),
    "korean": ("KOR", "South Korea"),
    "north korea": ("PRK", "North Korea"),
    "taiwan": ("TWN", "Taiwan"),
    "taiwanese": ("TWN", "Taiwan"),
    "mongolia": ("MNG", "Mongolia"),

    # Southeast Asia
    "indonesia": ("IDN", "Indonesia"),
    "indonesian": ("IDN", "Indonesia"),
    "philippines": ("PHL", "Philippines"),
    "filipino": ("PHL", "Philippines"),
    "vietnam": ("VNM", "Vietnam"),
    "vietnamese": ("VNM", "Vietnam"),
    "thailand": ("THA", "Thailand"),
    "thai": ("THA", "Thailand"),
    "malaysia": ("MYS", "Malaysia"),
    "singapore": ("SGP", "Singapore"),
    "myanmar": ("MMR", "Myanmar"),
    "burma": ("MMR", "Myanmar"),
    "cambodia": ("KHM", "Cambodia"),
    "cambodian": ("KHM", "Cambodia"),
    "laos": ("LAO", "Laos"),

    # Africa — North
    "egypt": ("EGY", "Egypt"),
    "egyptian": ("EGY", "Egypt"),
    "libya": ("LBY", "Libya"),
    "libyan": ("LBY", "Libya"),
    "tunisia": ("TUN", "Tunisia"),
    "algeria": ("DZA", "Algeria"),
    "morocco": ("MAR", "Morocco"),
    "moroccan": ("MAR", "Morocco"),
    "sudan": ("SDN", "Sudan"),
    "sudanese": ("SDN", "Sudan"),
    "south sudan": ("SSD", "South Sudan"),

    # Africa — West
    "nigeria": ("NGA", "Nigeria"),
    "nigerian": ("NGA", "Nigeria"),
    "ghana": ("GHA", "Ghana"),
    "senegal": ("SEN", "Senegal"),
    "ivory coast": ("CIV", "Ivory Coast"),
    "mali": ("MLI", "Mali"),
    "burkina faso": ("BFA", "Burkina Faso"),
    "niger": ("NER", "Niger"),
    "guinea": ("GIN", "Guinea"),
    "sierra leone": ("SLE", "Sierra Leone"),
    "liberia": ("LBR", "Liberia"),
    "liberian": ("LBR", "Liberia"),
    "cameroon": ("CMR", "Cameroon"),

    # Africa — East
    "ethiopia": ("ETH", "Ethiopia"),
    "ethiopian": ("ETH", "Ethiopia"),
    "kenya": ("KEN", "Kenya"),
    "kenyan": ("KEN", "Kenya"),
    "tanzania": ("TZA", "Tanzania"),
    "uganda": ("UGA", "Uganda"),
    "rwanda": ("RWA", "Rwanda"),
    "rwandan": ("RWA", "Rwanda"),
    "somalia": ("SOM", "Somalia"),
    "somali": ("SOM", "Somalia"),
    "eritrea": ("ERI", "Eritrea"),

    # Africa — Southern
    "south africa": ("ZAF", "South Africa"),
    "zimbabwe": ("ZWE", "Zimbabwe"),
    "mozambique": ("MOZ", "Mozambique"),
    "zambia": ("ZMB", "Zambia"),
    "angola": ("AGO", "Angola"),
    "namibia": ("NAM", "Namibia"),
    "botswana": ("BWA", "Botswana"),
    "madagascar": ("MDG", "Madagascar"),

    # Africa — Central
    "congo": ("COD", "Democratic Republic of the Congo"),
    "democratic republic of the congo": ("COD", "Democratic Republic of the Congo"),
    "republic of the congo": ("COG", "Republic of the Congo"),
    "central african republic": ("CAF", "Central African Republic"),
    "chad": ("TCD", "Chad"),

    # Oceania
    "australia": ("AUS", "Australia"),
    "australian": ("AUS", "Australia"),
    "new zealand": ("NZL", "New Zealand"),
    "papua new guinea": ("PNG", "Papua New Guinea"),
    "fiji": ("FJI", "Fiji"),

    # Other
    "greece": ("GRC", "Greece"),
    "greek": ("GRC", "Greece"),
}

# Ambiguous terms that need word-boundary matching to avoid false positives
# "jordan" could be a person's name, "georgia" could be a US state, etc.
# We'll still match them but note this is a known limitation.

# Pre-compile regex patterns for multi-word aliases and single-word aliases
# Sort by length descending so longer matches take priority
_sorted_aliases = sorted(COUNTRY_ALIASES.keys(), key=len, reverse=True)

# Build a single regex pattern for efficiency
# Use word boundaries to avoid partial matches
_pattern = re.compile(
    r'\b(' + '|'.join(re.escape(alias) for alias in _sorted_aliases) + r')\b',
    re.IGNORECASE
)


def extract_countries(text):
    """Extract country ISO3 codes from text using dictionary matching.
    Returns a set of ISO3 codes found in the text."""
    if not text:
        return set()

    found = set()
    for match in _pattern.finditer(text):
        alias = match.group(0).lower()
        if alias in COUNTRY_ALIASES:
            iso3, _ = COUNTRY_ALIASES[alias]
            found.add(iso3)
    return found


def main():
    if not DB_FILE.exists():
        print(f"Database not found: {DB_FILE}")
        print("Run csv_to_sqlite.py first to create the database.")
        sys.exit(1)

    print("=" * 60)
    print("COUNTRY MENTIONS EXTRACTION")
    print("=" * 60)
    print()

    conn = sqlite3.connect(str(DB_FILE))
    cursor = conn.execute(
        "SELECT pub_date_parsed, abstract, snippet, keywords FROM articles "
        "WHERE pub_date_parsed IS NOT NULL "
        "ORDER BY pub_date_parsed"
    )

    # Aggregate: {iso3: {year: count}}
    counts = defaultdict(lambda: defaultdict(int))
    # Co-occurrence: {iso3: Counter({other_iso3: count})}
    cooccurrence = defaultdict(Counter)
    total = 0
    matched = 0

    for row in cursor:
        pub_date, abstract, snippet, keywords_str = row

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
            for iso3 in countries:
                counts[iso3][year] += 1

            # Count co-occurrences (pairs of countries in the same article)
            if len(countries) >= 2:
                country_list = sorted(countries)
                for i in range(len(country_list)):
                    for j in range(i + 1, len(country_list)):
                        cooccurrence[country_list[i]][country_list[j]] += 1
                        cooccurrence[country_list[j]][country_list[i]] += 1

        if total % 200000 == 0:
            print(f"  Processed {total:,} articles, {matched:,} with country mentions...",
                  flush=True)

    conn.close()

    print(f"\nTotal articles: {total:,}")
    print(f"Articles with country mentions: {matched:,}")
    print(f"Unique countries found: {len(counts)}")

    # Build output
    years = list(range(2000, 2026))

    # Build country name lookup from aliases (ISO3 -> display name)
    iso3_to_name = {}
    for alias, (iso3, name) in COUNTRY_ALIASES.items():
        iso3_to_name[iso3] = name

    countries = []
    for iso3 in sorted(counts.keys()):
        values = [counts[iso3].get(y, 0) for y in years]
        countries.append({
            "id": iso3,
            "name": iso3_to_name.get(iso3, iso3),
            "values": values
        })

    # Sort by total mentions descending
    countries.sort(key=lambda c: sum(c["values"]), reverse=True)

    output = {
        "years": years,
        "countries": countries
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\nOutput: {OUTPUT_FILE}")
    print(f"\nTop 20 most mentioned countries:")
    for i, c in enumerate(countries[:20], 1):
        print(f"  {i:2d}. {c['id']} ({c['name']:30s}) — {sum(c['values']):,} total mentions")

    # Export co-occurrence data (top 15 connections per country)
    print(f"\nBuilding co-occurrence data...")
    cooc_output = {}
    for iso3, partners in cooccurrence.items():
        top_partners = partners.most_common(15)
        cooc_output[iso3] = [
            {"id": p_iso3, "name": iso3_to_name.get(p_iso3, p_iso3), "count": count}
            for p_iso3, count in top_partners
        ]

    with open(COOCCURRENCE_FILE, 'w') as f:
        json.dump(cooc_output, f, indent=2)

    print(f"Output: {COOCCURRENCE_FILE}")
    print(f"Countries with co-occurrence data: {len(cooc_output)}")

    # Show example
    if "IRQ" in cooc_output:
        print(f"\nExample — Iraq's top 5 co-mentioned countries:")
        for entry in cooc_output["IRQ"][:5]:
            print(f"  {entry['id']} ({entry['name']}) — {entry['count']:,} shared articles")

    print(f"\n{'=' * 60}")
    print("DONE!")
    print(f"{'=' * 60}")


if __name__ == '__main__':
    main()
