#!/usr/bin/env python3
"""
US City Mentions Preprocessing
===============================

Extracts US city mentions from NYT glocations keywords.
Aggregates total article counts per city with lat/lon coordinates.

Output: src/data/processed/us_city_mentions.json

Usage:
    python preprocess_cities.py
"""

import sqlite3
import json
from collections import Counter
from pathlib import Path
import sys

DB_FILE = Path("src/data/nyt.db")
OUTPUT_FILE = Path("src/data/processed/us_city_mentions.json")

# Mapping from NYT glocations value -> (canonical city, state abbrev)
# Covers major US cities as they appear in NYT keyword tags.
# Format in NYT: "City (StateAbbrev)" e.g. "Los Angeles (Calif)", "Chicago (Ill)"
# NYC boroughs and neighborhoods are rolled up into New York City.

# US cities with coordinates: (city, state, lat, lon)
US_CITIES = {
    # --- Direct matches (exact glocations value -> city) ---

    # New York City and boroughs/neighborhoods
    "New York City": ("New York City", "NY", 40.7128, -74.0060),
    "Manhattan (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Brooklyn (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Queens (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Bronx (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Staten Island (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "HARLEM (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "CENTRAL PARK (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Wall Street (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Times Square and 42nd Street (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Greenwich Village (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Upper West Side (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Upper East Side (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Chelsea (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Williamsburg (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "East Village (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Lower East Side (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "SoHo (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Chinatown (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "CONEY ISLAND (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "East River (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Park Slope (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Midtown Area (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "TriBeCa (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "West Village (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "TIMES SQUARE AND 42D STREET (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Bushwick (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Bed-Stuy (NYC)": ("New York City", "NY", 40.7128, -74.0060),

    # Washington DC
    "Washington (DC)": ("Washington", "DC", 38.9072, -77.0369),
    "WASHINGTON": ("Washington", "DC", 38.9072, -77.0369),

    # California
    "Los Angeles (Calif)": ("Los Angeles", "CA", 34.0522, -118.2437),
    "San Francisco (Calif)": ("San Francisco", "CA", 37.7749, -122.4194),
    "San Diego (Calif)": ("San Diego", "CA", 32.7157, -117.1611),
    "Oakland (Calif)": ("Oakland", "CA", 37.8044, -122.2712),
    "Sacramento (Calif)": ("Sacramento", "CA", 38.5816, -121.4944),
    "San Jose (Calif)": ("San Jose", "CA", 37.3382, -121.8863),
    "Berkeley (Calif)": ("Berkeley", "CA", 37.8716, -122.2727),
    "Santa Monica (Calif)": ("Santa Monica", "CA", 34.0195, -118.4912),
    "Hollywood (Calif)": ("Los Angeles", "CA", 34.0522, -118.2437),
    "Silicon Valley (Calif)": ("San Jose", "CA", 37.3382, -121.8863),
    "San Francisco Bay Area (Calif)": ("San Francisco", "CA", 37.7749, -122.4194),
    "Napa (Calif)": ("Napa", "CA", 38.2975, -122.2869),
    "Pasadena (Calif)": ("Pasadena", "CA", 34.1478, -118.1445),
    "Long Beach (Calif)": ("Long Beach", "CA", 33.7701, -118.1937),
    "Fresno (Calif)": ("Fresno", "CA", 36.7378, -119.7871),
    "Anaheim (Calif)": ("Anaheim", "CA", 33.8366, -117.9143),

    # Illinois
    "Chicago (Ill)": ("Chicago", "IL", 41.8781, -87.6298),

    # Texas
    "Houston (Tex)": ("Houston", "TX", 29.7604, -95.3698),
    "Dallas (Tex)": ("Dallas", "TX", 32.7767, -96.7970),
    "Austin (Tex)": ("Austin", "TX", 30.2672, -97.7431),
    "San Antonio (Tex)": ("San Antonio", "TX", 29.4241, -98.4936),
    "Fort Worth (Tex)": ("Fort Worth", "TX", 32.7555, -97.3308),
    "El Paso (Tex)": ("El Paso", "TX", 31.7619, -106.4850),

    # Massachusetts
    "Boston (Mass)": ("Boston", "MA", 42.3601, -71.0589),
    "Cambridge (Mass)": ("Cambridge", "MA", 42.3736, -71.1097),
    "Cape Cod (Mass)": ("Cape Cod", "MA", 41.6688, -70.2962),

    # Pennsylvania
    "Philadelphia (Pa)": ("Philadelphia", "PA", 39.9526, -75.1652),
    "Pittsburgh (Pa)": ("Pittsburgh", "PA", 40.4406, -79.9959),

    # Michigan
    "Detroit (Mich)": ("Detroit", "MI", 42.3314, -83.0458),
    "Flint (Mich)": ("Flint", "MI", 43.0125, -83.6875),
    "Ann Arbor (Mich)": ("Ann Arbor", "MI", 42.2808, -83.7430),

    # Florida
    "Miami (Fla)": ("Miami", "FL", 25.7617, -80.1918),
    "Orlando (Fla)": ("Orlando", "FL", 28.5383, -81.3792),
    "Tampa (Fla)": ("Tampa", "FL", 27.9506, -82.4572),
    "Miami Beach (Fla)": ("Miami", "FL", 25.7617, -80.1918),
    "Palm Beach (Fla)": ("Palm Beach", "FL", 26.7056, -80.0364),
    "Fort Lauderdale (Fla)": ("Fort Lauderdale", "FL", 26.1224, -80.1373),
    "Jacksonville (Fla)": ("Jacksonville", "FL", 30.3322, -81.6557),

    # Georgia
    "Atlanta (Ga)": ("Atlanta", "GA", 33.7490, -84.3880),

    # Nevada
    "Las Vegas (Nev)": ("Las Vegas", "NV", 36.1699, -115.1398),

    # Washington State
    "Seattle (Wash)": ("Seattle", "WA", 47.6062, -122.3321),

    # Maryland
    "Baltimore (Md)": ("Baltimore", "MD", 39.2904, -76.6122),

    # Minnesota
    "Minneapolis (Minn)": ("Minneapolis", "MN", 44.9778, -93.2650),

    # Oregon
    "Portland (Ore)": ("Portland", "OR", 45.5152, -122.6784),

    # Colorado
    "Denver (Colo)": ("Denver", "CO", 39.7392, -104.9903),
    "Boulder (Colo)": ("Boulder", "CO", 40.0150, -105.2705),

    # Connecticut
    "New Haven (Conn)": ("New Haven", "CT", 41.3083, -72.9279),
    "Hartford (Conn)": ("Hartford", "CT", 41.7658, -72.6734),
    "Stamford (Conn)": ("Stamford", "CT", 41.0534, -73.5387),
    "Bridgeport (Conn)": ("Bridgeport", "CT", 41.1865, -73.1952),
    "Greenwich (Conn)": ("Greenwich", "CT", 41.0262, -73.6282),
    "Newtown (Conn)": ("Newtown", "CT", 41.4140, -73.3032),

    # New Jersey
    "Newark (NJ)": ("Newark", "NJ", 40.7357, -74.1724),
    "Jersey City (NJ)": ("Jersey City", "NJ", 40.7178, -74.0431),
    "Atlantic City (NJ)": ("Atlantic City", "NJ", 39.3643, -74.4229),
    "Hoboken (NJ)": ("Hoboken", "NJ", 40.7440, -74.0324),
    "Camden (NJ)": ("Camden", "NJ", 39.9259, -75.1196),
    "Princeton (NJ)": ("Princeton", "NJ", 40.3573, -74.6672),
    "Trenton (NJ)": ("Trenton", "NJ", 40.2171, -74.7429),
    "Paterson (NJ)": ("Paterson", "NJ", 40.9168, -74.1718),
    "Montclair (NJ)": ("Montclair", "NJ", 40.8259, -74.2090),

    # Tennessee
    "Nashville (Tenn)": ("Nashville", "TN", 36.1627, -86.7816),
    "Memphis (Tenn)": ("Memphis", "TN", 35.1495, -90.0490),

    # Missouri
    "St Louis (Mo)": ("St. Louis", "MO", 38.6270, -90.1994),
    "Kansas City (Mo)": ("Kansas City", "MO", 39.0997, -94.5786),
    "Ferguson (Mo)": ("Ferguson", "MO", 38.7442, -90.3053),

    # Ohio
    "Cleveland (Ohio)": ("Cleveland", "OH", 41.4993, -81.6944),
    "Cincinnati (Ohio)": ("Cincinnati", "OH", 39.1031, -84.5120),
    "Columbus (Ohio)": ("Columbus", "OH", 39.9612, -82.9988),

    # Arizona
    "Phoenix (Ariz)": ("Phoenix", "AZ", 33.4484, -112.0740),
    "Tucson (Ariz)": ("Tucson", "AZ", 32.2226, -110.9747),

    # Wisconsin
    "Milwaukee (Wis)": ("Milwaukee", "WI", 43.0389, -87.9065),

    # Indiana
    "Indianapolis (Ind)": ("Indianapolis", "IN", 39.7684, -86.1581),

    # Oklahoma
    "Oklahoma City (Okla)": ("Oklahoma City", "OK", 35.4676, -97.5164),
    "Tulsa (Okla)": ("Tulsa", "OK", 36.1540, -95.9928),

    # Kentucky
    "Louisville (Ky)": ("Louisville", "KY", 38.2527, -85.7585),

    # North Carolina
    "Charlotte (NC)": ("Charlotte", "NC", 35.2271, -80.8431),
    "Raleigh (NC)": ("Raleigh", "NC", 35.7796, -78.6382),

    # South Carolina
    "Charleston (SC)": ("Charleston", "SC", 32.7765, -79.9311),

    # Alabama
    "Birmingham (Ala)": ("Birmingham", "AL", 33.5207, -86.8025),

    # Louisiana
    "New Orleans (La)": ("New Orleans", "LA", 29.9511, -90.0715),
    "Baton Rouge (La)": ("Baton Rouge", "LA", 30.4515, -91.1871),

    # Virginia
    "Charlottesville (Va)": ("Charlottesville", "VA", 38.0293, -78.4767),
    "Richmond (Va)": ("Richmond", "VA", 37.5407, -77.4360),

    # New Mexico
    "Santa Fe (NM)": ("Santa Fe", "NM", 35.6870, -105.9378),
    "ALBUQUERQUE (NM)": ("Albuquerque", "NM", 35.0844, -106.6504),
    "Albuquerque (NM)": ("Albuquerque", "NM", 35.0844, -106.6504),

    # Rhode Island
    "Providence (RI)": ("Providence", "RI", 41.8240, -71.4128),

    # Utah
    "Salt Lake City (Utah)": ("Salt Lake City", "UT", 40.7608, -111.8910),

    # New York state cities (not NYC)
    "ALBANY (NY)": ("Albany", "NY", 42.6526, -73.7562),
    "Albany (NY)": ("Albany", "NY", 42.6526, -73.7562),
    "Buffalo (NY)": ("Buffalo", "NY", 42.8864, -78.8784),
    "Yonkers (NY)": ("Yonkers", "NY", 40.9312, -73.8987),
    "Rochester (NY)": ("Rochester", "NY", 43.1566, -77.6088),
    "Syracuse (NY)": ("Syracuse", "NY", 43.0481, -76.1474),
    "White Plains (NY)": ("White Plains", "NY", 41.0340, -73.7629),
    "New Rochelle (NY)": ("New Rochelle", "NY", 40.9115, -73.7824),
    "Mount Vernon (NY)": ("Mount Vernon", "NY", 40.9126, -73.8371),
    "Hamptons (NY)": ("Hamptons", "NY", 40.9390, -72.2693),
    "East Hampton (NY)": ("Hamptons", "NY", 40.9390, -72.2693),
    "Southampton (NY)": ("Hamptons", "NY", 40.9390, -72.2693),
    "Montauk (NY)": ("Hamptons", "NY", 40.9390, -72.2693),
    "Sag Harbor (NY)": ("Hamptons", "NY", 40.9390, -72.2693),
    "Long Beach (NY)": ("Long Beach NY", "NY", 40.5884, -73.6579),
    "Saratoga Springs (NY)": ("Saratoga Springs", "NY", 43.0831, -73.7846),
    "Huntington (NY)": ("Huntington", "NY", 40.8682, -73.4257),
    "Hempstead (NY)": ("Hempstead", "NY", 40.7062, -73.6187),
    "Scarsdale (NY)": ("Scarsdale", "NY", 40.9888, -73.7846),
    "Mamaroneck (NY)": ("Mamaroneck", "NY", 40.9488, -73.7335),
    "Tarrytown (NY)": ("Tarrytown", "NY", 41.0762, -73.8587),
    "Chappaqua (NY)": ("Chappaqua", "NY", 41.1595, -73.7718),
    "Greenburgh (NY)": ("Greenburgh", "NY", 41.0329, -73.8421),
    "Peekskill (NY)": ("Peekskill", "NY", 41.2901, -73.9204),
    "Buchanan (NY)": ("Buchanan", "NY", 41.2612, -73.9382),
    "Ossining (NY)": ("Ossining", "NY", 41.1626, -73.8615),
    "Garden City (NY)": ("Garden City", "NY", 40.7268, -73.6343),
    "Great Neck (NY)": ("Great Neck", "NY", 40.8007, -73.7285),
    "Larchmont (NY)": ("Larchmont", "NY", 40.9279, -73.7518),
    "Rye (NY)": ("Rye", "NY", 40.9807, -73.6837),
    "Port Chester (NY)": ("Port Chester", "NY", 41.0018, -73.6657),
    "Mount Kisco (NY)": ("Mount Kisco", "NY", 41.2048, -73.7271),
    "Hastings-on-Hudson (NY)": ("Hastings-on-Hudson", "NY", 40.9926, -73.8787),
    "Riverhead (NY)": ("Riverhead", "NY", 40.9168, -72.6620),
    "Hudson (NY)": ("Hudson", "NY", 42.2528, -73.7907),
    "Brookhaven (NY)": ("Brookhaven", "NY", 40.7793, -72.9154),

    # Additional NYC neighborhoods (roll up to NYC)
    "Bedford-Stuyvesant (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Bushwick (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Bed-Stuy (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Crown Heights (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Governors Island (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Long Island City (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Prospect Park (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Zuccotti Park (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "WEST SIDE (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "WASHINGTON HEIGHTS (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Red Hook (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Flushing (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Greenpoint (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "ROOSEVELT ISLAND (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "BATTERY PARK CITY (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Astoria (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "East Harlem (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Park Avenue (NYC)": ("New York City", "NY", 40.7128, -74.0060),
    "Bryant Park (NYC)": ("New York City", "NY", 40.7128, -74.0060),

    # Hawaii
    "Honolulu (Hawaii)": ("Honolulu", "HI", 21.3069, -157.8583),
    "Pearl Harbor (Hawaii)": ("Honolulu", "HI", 21.3069, -157.8583),

    # Nebraska
    "Omaha (Neb)": ("Omaha", "NE", 41.2565, -95.9345),

    # Iowa
    "Des Moines (Iowa)": ("Des Moines", "IA", 41.5868, -93.6250),

    # Kansas
    "Wichita (Kan)": ("Wichita", "KS", 37.6872, -97.3301),

    # Colorado (additional)
    "Aspen (Colo)": ("Aspen", "CO", 39.1911, -106.8175),
    "Colorado Springs (Colo)": ("Colorado Springs", "CO", 38.8339, -104.8214),
    "Aurora (Colo)": ("Aurora", "CO", 39.7294, -104.8319),
    "Vail (Colo)": ("Vail", "CO", 39.6403, -106.3742),

    # Connecticut (additional)
    "Fairfield (Conn)": ("Fairfield", "CT", 41.1408, -73.2637),
    "Westport (Conn)": ("Westport", "CT", 41.1415, -73.3579),
    "Norwalk (Conn)": ("Norwalk", "CT", 41.1177, -73.4082),
    "New Canaan (Conn)": ("New Canaan", "CT", 41.1468, -73.4948),
    "Darien (Conn)": ("Darien", "CT", 41.0537, -73.4687),
    "Waterbury (Conn)": ("Waterbury", "CT", 41.5582, -73.0515),

    # New Jersey (additional)
    "Fort Lee (NJ)": ("Fort Lee", "NJ", 40.8509, -73.9712),
    "Asbury Park (NJ)": ("Asbury Park", "NJ", 40.2204, -74.0121),
    "Maplewood (NJ)": ("Maplewood", "NJ", 40.7312, -74.2735),
    "New Brunswick (NJ)": ("New Brunswick", "NJ", 40.4862, -74.4518),
    "Bayonne (NJ)": ("Bayonne", "NJ", 40.6687, -74.1143),

    # Florida (additional)
    "Jacksonville (Fla)": ("Jacksonville", "FL", 30.3322, -81.6557),
    "Fort Lauderdale (Fla)": ("Fort Lauderdale", "FL", 26.1224, -80.1373),
    "Sanford (Fla)": ("Sanford", "FL", 28.8003, -81.2731),
    "Key West (Fla)": ("Key West", "FL", 24.5551, -81.7800),
    "Palm Springs (Calif)": ("Palm Springs", "CA", 33.8303, -116.5453),
    "Parkland (Fla)": ("Parkland", "FL", 26.1700, -80.2334),

    # California (additional)
    "Beverly Hills (Calif)": ("Beverly Hills", "CA", 34.0736, -118.4004),
    "Orange County (Calif)": ("Orange County", "CA", 33.7175, -117.8311),
    "Santa Barbara (Calif)": ("Santa Barbara", "CA", 34.4208, -119.6982),
    "Malibu (Calif)": ("Malibu", "CA", 34.0259, -118.7798),
    "Pasadena (Calif)": ("Pasadena", "CA", 34.1478, -118.1445),
    "Long Beach (Calif)": ("Long Beach", "CA", 33.7701, -118.1937),
    "Fresno (Calif)": ("Fresno", "CA", 36.7378, -119.7871),
    "Anaheim (Calif)": ("Anaheim", "CA", 33.8366, -117.9143),

    # Minnesota (additional)
    "St Paul (Minn)": ("St. Paul", "MN", 44.9537, -93.0900),

    # North Carolina (additional)
    "Durham (NC)": ("Durham", "NC", 35.9940, -78.8986),
    "Raleigh (NC)": ("Raleigh", "NC", 35.7796, -78.6382),

    # Georgia (additional)
    "Savannah (Ga)": ("Savannah", "GA", 32.0809, -81.0912),

    # Utah (additional)
    "Park City (Utah)": ("Park City", "UT", 40.6461, -111.4980),

    # Rhode Island (additional)
    "Newport (RI)": ("Newport", "RI", 41.4901, -71.3128),

    # Wisconsin (additional)
    "Madison (Wis)": ("Madison", "WI", 43.0731, -89.4012),

    # Mississippi
    "Jackson (Miss)": ("Jackson", "MS", 32.2988, -90.1848),

    # Alabama (additional)
    "Montgomery (Ala)": ("Montgomery", "AL", 32.3792, -86.3077),

    # Tennessee (additional)
    "Chattanooga (Tenn)": ("Chattanooga", "TN", 35.0456, -85.3097),

    # Arkansas
    "Little Rock (Ark)": ("Little Rock", "AR", 34.7465, -92.2896),

    # Idaho
    "Boise (Idaho)": ("Boise", "ID", 43.6150, -116.2023),

    # Arizona (additional)
    "Scottsdale (Ariz)": ("Scottsdale", "AZ", 33.4942, -111.9261),

    # Massachusetts (additional)
    "Cambridge (Mass)": ("Cambridge", "MA", 42.3736, -71.1097),
    "Cape Cod (Mass)": ("Cape Cod", "MA", 41.6688, -70.2962),
    "Nantucket (Mass)": ("Nantucket", "MA", 41.2835, -70.0995),
    "Berkshires (Mass)": ("Berkshires", "MA", 42.3118, -73.1822),

    # Texas (additional)
    "Galveston (Tex)": ("Galveston", "TX", 29.3013, -94.7977),
    "Fort Hood (Tex)": ("Fort Hood", "TX", 31.1350, -97.7753),
}

# Case-insensitive lookup
US_CITIES_LOWER = {k.lower(): v for k, v in US_CITIES.items()}


def main():
    if not DB_FILE.exists():
        print(f"Database not found: {DB_FILE}")
        print("Run csv_to_sqlite.py first to create the database.")
        sys.exit(1)

    print("=" * 60)
    print("US CITY MENTIONS EXTRACTION")
    print("=" * 60)
    print()

    conn = sqlite3.connect(str(DB_FILE))
    cursor = conn.execute(
        "SELECT keywords FROM articles "
        "WHERE keywords IS NOT NULL AND keywords != ''"
    )

    # Count unique articles per canonical city
    city_counts = Counter()
    total = 0
    matched = 0

    for (keywords_str,) in cursor:
        total += 1

        try:
            keywords = json.loads(keywords_str.replace("'", '"'))
        except (json.JSONDecodeError, ValueError):
            continue

        # Extract glocations
        article_cities = set()
        for kw in keywords:
            if not isinstance(kw, dict) or kw.get('name') != 'glocations':
                continue
            val = kw.get('value', '')
            val_lower = val.lower()
            if val_lower in US_CITIES_LOWER:
                canonical = US_CITIES_LOWER[val_lower]
                article_cities.add(canonical[0])  # canonical city name

        if article_cities:
            matched += 1
            for city in article_cities:
                city_counts[city] += 1

        if total % 500000 == 0:
            print(f"  Processed {total:,} articles...", flush=True)

    conn.close()

    print(f"\nTotal articles scanned: {total:,}")
    print(f"Articles with US city mentions: {matched:,}")
    print(f"Unique cities found: {len(city_counts)}")

    # Build output with coordinates
    # Create reverse lookup: canonical city name -> (city, state, lat, lon)
    city_info = {}
    for val in US_CITIES.values():
        city_name, state, lat, lon = val
        if city_name not in city_info:
            city_info[city_name] = (state, lat, lon)

    output = []
    for city_name, count in city_counts.most_common():
        if city_name in city_info:
            state, lat, lon = city_info[city_name]
            output.append({
                "city": city_name,
                "state": state,
                "lat": lat,
                "lon": lon,
                "count": count
            })

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\nOutput: {OUTPUT_FILE}")
    print(f"\nTop 30 US cities by mention count:")
    for i, entry in enumerate(output[:30], 1):
        print(f"  {i:2d}. {entry['city']:25s} ({entry['state']}) — {entry['count']:,}")

    print(f"\n{'=' * 60}")
    print("DONE!")
    print(f"{'=' * 60}")


if __name__ == '__main__':
    main()
