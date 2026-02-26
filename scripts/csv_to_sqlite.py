#!/usr/bin/env python3
"""Convert NYT CSV to SQLite database with date index for fast querying."""

import sqlite3
import pandas as pd
import sys
from pathlib import Path

CSV_FILE = Path("src/data/nyt-metadata.csv")
DB_FILE = Path("src/data/nyt.db")

CHUNK_SIZE = 50000

def main():
    if DB_FILE.exists():
        print(f"Removing existing database: {DB_FILE}")
        DB_FILE.unlink()

    conn = sqlite3.connect(str(DB_FILE))

    print(f"Converting {CSV_FILE} -> {DB_FILE}")
    print(f"Reading in chunks of {CHUNK_SIZE:,} rows...")

    total_rows = 0
    for i, chunk in enumerate(pd.read_csv(CSV_FILE, chunksize=CHUNK_SIZE)):
        # Parse pub_date and extract just the date part as a string
        chunk['pub_date_parsed'] = pd.to_datetime(chunk['pub_date'], errors='coerce').dt.strftime('%Y-%m-%d')

        chunk.to_sql('articles', conn, if_exists='append', index=False)
        total_rows += len(chunk)

        if (i + 1) % 5 == 0:
            print(f"  {total_rows:,} rows inserted...", flush=True)

    print(f"\nTotal rows: {total_rows:,}")
    print("Creating indexes...")

    conn.execute("CREATE INDEX idx_pub_date ON articles(pub_date_parsed)")
    conn.execute("CREATE INDEX idx_section ON articles(section_name)")
    conn.execute("CREATE INDEX idx_news_desk ON articles(news_desk)")

    conn.commit()

    # Quick stats
    cursor = conn.execute("SELECT MIN(pub_date_parsed), MAX(pub_date_parsed) FROM articles WHERE pub_date_parsed IS NOT NULL")
    min_date, max_date = cursor.fetchone()
    print(f"\nDate range: {min_date} to {max_date}")

    cursor = conn.execute("SELECT COUNT(*) FROM articles")
    count = cursor.fetchone()[0]
    print(f"Total articles: {count:,}")

    conn.close()
    db_size = DB_FILE.stat().st_size / (1024 * 1024 * 1024)
    print(f"Database size: {db_size:.2f} GB")
    print("Done!")

if __name__ == '__main__':
    main()
