# Week 1 - February 16-22, 2026

## Starting point and motivation

I wanted to explore how the New York Times covers the world by analyzing geographic patterns across 2.2M articles (2000-2023). The NYT frequently mentions countries in its headlines, which makes it possible to extract geographic attention patterns from the dataset without full article text. The dataset contains headlines, abstracts, snippets, keywords, bylines, and section labels.

## Data pipeline

I converted the raw CSV (4.3 GB) to SQLite with a date index, which made all subsequent work fast and modular. Every new analysis reads from the same database and writes pre-computed JSON files that the browser loads directly, with no server-side processing.

## World map: country mentions over time

The first visualization is an animated choropleth showing per-year country mention frequency. I extract countries using a dictionary of ~200 names and aliases compiled into a single regex. About 31% of articles mention at least one country, with 150 countries detected in total. A log color scale turned out to be necessary because US mentions (~12k/year) are orders of magnitude above smaller countries.

## Design and technical choices

I chose vanilla JS and D3.js v7 because I like working without frameworks. It keeps things simple and gives full control. The site uses static hosting only. The main challenges this week were handling the CSV scale, and choosing the right color scale for the map.

## AI disclosure

- CSV-to-SQLite conversion was generated with AI assistance
- The regex-based country extraction algorithm was developed with AI support
