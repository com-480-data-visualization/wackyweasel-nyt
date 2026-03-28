# Week 7 - March 30 - April 5, 2026

## Co-occurrence map - hover interaction

I reworked the co-occurrence map from the automated animation to a hover-triggered interaction. The map now responds to the user hovering over a country, drawing connection arcs to the top 10 co-mentioned countries. When the mouse leaves, everything fades back. I added a generation counter to prevent animation interleaving when the user moves quickly between countries.

The tooltip was expanded into a side panel showing the country name, total headline mentions, an animated sparkline of coverage over time, and a ranked list of the top co-mentioned countries.

## Front page map and bubble map improvements

The trend arrow map and US city bubble map both received animated sparkline tooltips showing yearly coverage percentages. The bubble map now dims all other bubbles when hovering over a city, creating a spotlight effect.

## Data normalization

Investigating the trend arrows revealed that almost every country showed decreasing coverage. This turned out to be because the NYT published roughly 110,000 articles per year in the early 2000s but only around 50,000 in recent years. I updated all preprocessing to normalize counts as a percentage of total articles per year. For consistency, dates 2024 and 2025 are excluded from all data throughout this report.

I also switched country extraction from scanning all text fields to headlines only, since the abstract and snippet fields inflated co-occurrence counts by repeating the same information.

## AI disclosure

- Co-occurrence hover interaction and sparkline tooltips were AI-assisted
- Data normalization pipeline was AI-assisted
