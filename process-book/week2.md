# Week 2 - February 23 - March 1, 2026

## Bar chart race: a short detour

I briefly explored an animated bar chart showing the 15 most frequent words per year, but quickly realized it did not fit the main theme of geographic country analysis. I decided to focus entirely on map-based visualizations going forward.

## US city bubble map

I added a bubble map of US city mentions using an AlbersUSA projection. The data source is the glocations field in the NYT keyword metadata, specifically structured tags like "Los Angeles (Calif)" or "Manhattan (NYC)". The preprocessing maps ~200 of these variants to canonical cities with lat/lon coordinates, rolling up NYC boroughs and neighborhoods into a single entry.

Out of 2.2M articles, 188k have US city tags across 160 unique cities. New York City dominates at 120k mentions, followed by Washington DC (15k), Los Angeles (5.7k), and Chicago (4.3k). The map makes the NYT's geographic concentration immediately visible: heavy coverage in the Northeast corridor and California, with sparse coverage elsewhere. In dense regions like NYC, LA, and SF, the bubbles overlap heavily and are hard to distinguish. I planned to later add metro sub-zooms into these areas to make them more readable.

The original sketch from milestone 2 translated surprisingly well to the actual implementation. I could more or less bring the sketch directly to the website.

## AI disclosure

- The US city dictionary mapping NYT glocations variants to canonical city names was built with AI assistance
- Database query optimization for extracting glocations counts was AI-assisted
