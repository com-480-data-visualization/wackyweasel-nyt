# Words That Shaped History: Temporal Analysis of NYT Coverage

## Project Goal

We visualize how the New York Times covers major historical events by analyzing word frequency patterns across 2.2 million articles (2000-2025). Rather than a static overview, we let users compare how language around similar types of events evolved over decades. How did "terrorism" after 9/11 compare to "invasion" during the Ukraine war? Did "economy" dominate Obama-era coverage the same way as Trump-era coverage? Our tool answers these questions through interactive, side-by-side temporal comparisons.

The target audience is journalists, political scientists, and anyone curious about how media narratives form around major events. The visualization reveals not just what was covered, but how coverage intensity, duration, and vocabulary shifted across eras.

## Visualizations

### 1. Event Comparison Timeline (MVP - Core)

Two overlapping time series on a shared axis. Each event period is normalized to "months since start" so users can directly compare coverage dynamics. For example, the 9/11 aftermath vs the first months of the Ukraine invasion.

```
  Mentions/day
  |        /\
  |   ____/  \___  9/11 (red)        Key: Dashed vertical lines
  |  /            \____               mark pivotal dates
  | /    /\                           (Sept 11, Feb 24 invasion)
  |/____/  \_______  Ukraine (blue)
  +-----|-----|-----|-----|---> months
  0     6    12    18    24
```

**Interaction**: Click word buttons to switch terms. Hover for daily counts. Toggle between event pairs (wars, presidents).

**Tools**: D3.js (d3-scale, d3-shape, d3-transition, d3-axis), SVG
**Lectures**: Interaction, Perception, Design for data visualization

### 2. World Map: Geographic Focus Over Time (Extra)

Animated choropleth showing how often each country is mentioned in NYT articles per year. A timeline slider lets users scrub through 2000-2025 to see US foreign policy focus shift (Middle East post-9/11, Russia/Ukraine 2022, China trade war).

```
  +----------------------------------+
  |  [2003]  ----O------------  [2025]
  |                                  |
  |    +------+                      |
  |    | World map with countries    |
  |    | shaded by mention freq.     |
  |    | Dark = high, light = low    |
  |    +------+                      |
  +----------------------------------+
```

**Tools**: D3.js (d3-geo), TopoJSON, Natural Earth Data
**Lectures**: Maps, Interaction, Practical maps

### 3. Gender Analysis: Who Covers What (Extra)

Diverging bar chart or stacked area showing topic coverage split by author gender. We infer gender from byline first names using a name-gender dataset, then cross-reference with article topics.

```
  Sports    ████████|██
  Politics  ██████|████
  Science   ████|██████
  Arts      ███|███████
            Male    Female
```

**Tools**: D3.js (d3-scale, d3-shape), Python (gender inference preprocessing)
**Lectures**: Marks and channels, Tabular data, Design

## Tools and Lectures Summary

| Component | Tools | Relevant Lectures |
|-----------|-------|-------------------|
| Time series overlay | D3.js line/area charts | Interaction, Perception |
| Word selection UI | D3.js, HTML/CSS | Design, Interaction |
| Data preprocessing | Python, SQLite | - |
| World map | D3.js d3-geo, TopoJSON | Maps, Practical maps |
| Gender analysis | D3.js bar charts, Python NLP | Tabular data, Marks & channels |
| Responsive layout | CSS Grid/Flexbox | Design |

## Implementation Breakdown

### Core Visualization (MVP)

These are required and already functional:

1. **Event comparison timeline** — dual line chart with normalized time axis, word selector buttons, hover tooltips, animated transitions
2. **Event pair selector** — switch between thematic comparisons (wars, presidents)
3. **Curated word sets** — 10 pre-selected words per event pair chosen for maximum contrast
4. **Statistics panel** — peak mentions, averages, side-by-side metrics
5. **SQLite preprocessing pipeline** — indexed database for fast event-based queries

### Extra Features (Enhancements)

These add depth but can be dropped without losing the core story:

6. **World map with timeline slider** — country mention frequency as animated choropleth, showing geographic attention shifts
7. **Gender-topic analysis** — who writes about what, and how that changed over 25 years
8. **Additional event pairs** — Financial Crisis vs COVID, other thematic comparisons
9. **Scrollytelling narrative** — guided story mode that walks users through key insights
10. **Word search** — let users type custom words instead of only pre-selected ones

## Current Prototype Status

The functional prototype is running and demonstrates the core visualization:
- Event comparison timeline with 9/11 vs Ukraine War and Obama vs Trump
- 10 curated words per comparison with instant switching
- Weekly-aggregated overlay chart with key date annotations
- Hover tooltips showing both events simultaneously
- Side-by-side statistics
- Full preprocessing pipeline (2.2M articles in SQLite, queries in seconds)
