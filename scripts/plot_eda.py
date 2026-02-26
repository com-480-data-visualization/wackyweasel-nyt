#!/usr/bin/env python3
"""
EDA Plot: Article Volume & Country Mentions
============================================

Generates a dual-axis chart showing total NYT articles per year (bars)
and country mentions in headlines (line), including excluded years.

Output: eda_article_counts.png

Usage:
    python plot_eda.py
"""

import sqlite3
import json
import logging
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

logging.basicConfig(level=logging.INFO, format='%(message)s')
log = logging.getLogger(__name__)

DB = Path("src/data/nyt.db")
MENTIONS = Path("src/data/processed/country_mentions.json")
OUT = Path("eda_article_counts.png")


def main():
    log.info("Querying article counts from %s ...", DB)
    conn = sqlite3.connect(str(DB))
    rows = conn.execute("""
        SELECT substr(pub_date_parsed, 1, 4) as year, COUNT(*) as cnt
        FROM articles WHERE pub_date_parsed IS NOT NULL
        GROUP BY year ORDER BY year
    """).fetchall()
    conn.close()

    all_years = [int(r[0]) for r in rows]
    all_counts = [r[1] for r in rows]
    log.info("  %d years, %d total articles", len(all_years), sum(all_counts))
    for y, c in zip(all_years, all_counts):
        log.info("  %d: %d", y, c)

    log.info("Loading country mentions from %s ...", MENTIONS)
    data = json.loads(MENTIONS.read_text())
    mention_years = data["years"]
    articles_py = data["articles_per_year"]
    raw_mentions = []
    for yi in range(len(mention_years)):
        total_pct = sum(c["values"][yi] for c in data["countries"])
        raw_mentions.append(int(round(total_pct / 100 * articles_py[yi])))
    log.info("  %d years of mention data (%d-%d)", len(mention_years), mention_years[0], mention_years[-1])

    log.info("Generating plot ...")
    fig, ax1 = plt.subplots(figsize=(10, 5))

    blue = '#3498db'
    red = '#e74c3c'

    for y, c in zip(all_years, all_counts):
        alpha = 0.7 if y <= 2023 else 0.3
        ax1.bar(y, c, color=blue, alpha=alpha)

    ax1.set_xlabel('Year')
    ax1.set_ylabel('Total articles', color=blue)
    ax1.tick_params(axis='y', labelcolor=blue)

    ax2 = ax1.twinx()
    ax2.plot(mention_years, raw_mentions, color=red, linewidth=2, marker='o', markersize=4)
    ax2.set_ylabel('Country mentions in headlines', color=red)
    ax2.tick_params(axis='y', labelcolor=red)

    ax1.axvline(x=2023.5, color='gray', linestyle='--', alpha=0.7)
    ax1.text(2024.5, max(all_counts) * 0.92, 'excluded', fontsize=9, color='gray', ha='center')

    ax1.set_title('NYT Article Volume and Country Mentions per Year')
    fig.tight_layout()
    fig.savefig(str(OUT), dpi=300, bbox_inches='tight')
    log.info("Saved %s", OUT)


if __name__ == '__main__':
    main()
