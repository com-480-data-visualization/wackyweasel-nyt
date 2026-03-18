# Milestone 2

## Project Goal

I visualize how the New York Times covers the world by analyzing geographic patterns across 2.2 million articles (2000-2023). The visualization reveals which countries dominate headlines, how coverage shifts over time, which countries are mentioned together, and where in the US the NYT reports from beyond New York City. The site is a scroll-driven, dark-themed experience with five full-viewport sections, each answering a different question about NYT geographic attention.

Target audience: journalists, media researchers, and anyone curious about how one of the world's most influential newspapers distributes its attention across countries and cities.

## Visualizations

### 1. Co-occurrence Map (Core)

Animated world map that cycles through countries, drawing arc connections to the countries most frequently co-mentioned in the same articles. A red travel line moves between countries, and a side panel ranks the top co-mentioned partners.

![Co-occurrence sketch](sketches/cooccurrence.png)

**Interaction**: Fully automated animation that loops indefinitely. Arcs are color-coded by impact (article count).

**Tools**: D3.js (d3-geo, d3-transition), TopoJSON, Natural Earth
**Lectures**: Maps, Interaction, Perception

### 2. Front Page Trend Map (Core)

World map with two toggle modes:

- **Trend**: Diagonal arrows per country showing whether front page mentions increased or decreased over 2000-2023. Blue arrows point up-right (increasing), red arrows point down-right (decreasing). Arrow length is sqrt-scaled by slope magnitude.
- **By Year**: Vertical arrows showing each country's front page mention percentage for a selected year. A slider scrubs through 2000-2023. Hovering a country triggers a typewriter-animated tooltip cycling through actual NYT headlines from that country and year.

![Front page map sketch](sketches/frontpage.png)

**Interaction**: Toggle buttons switch modes. Year slider with smooth arrow transitions. Hover tooltips with headline cycling.

**Tools**: D3.js (d3-geo, d3-transition, d3-scale), TopoJSON, SVG markers
**Lectures**: Maps, Interaction, Marks and channels

### 3. US City Bubble Map (Core)

AlbersUSA projection with sqrt-scaled bubbles at each city mentioned in NYT datelines. New York City and Washington DC dominate, but the map reveals surprising secondary cities. Hover tooltips show exact article counts.

![Bubble map sketch](sketches/bubblemap.png)

**Tools**: D3.js (d3-geo, d3-scale), TopoJSON (US states), AlbersUSA projection
**Lectures**: Maps, Practical maps, Perception

### 4. Word Count by Country Grid (Extra)

Grid cartogram showing average article word count by mentioned country. Darker cells indicate longer average articles. Reveals which countries receive deeper coverage vs brief mentions.

![Word count sketch](sketches/wordcount.png)

**Tools**: D3.js (d3-scale), SVG
**Lectures**: Tabular data, Marks and channels

### 5. Background Dot Map + Typewriter Effects (Extra)

Fixed SVG overlay on the header showing animated dots spawning at random country locations with bright ping animations, line draw-up, and typewriter country name labels. Dots fade to 50% then collapse. Creates an ambient data-art introduction.

Section titles use a typewriter effect with typo simulation (nearby-key errors that get corrected), re-triggering on each scroll.

**Tools**: D3.js, CSS animations, IntersectionObserver
**Lectures**: Perception, Design

## Tools and Lectures Summary

| Component | Tools | Relevant Lectures |
|-----------|-------|-------------------|
| World maps (co-occurrence, front page) | D3.js d3-geo, TopoJSON | Maps, Practical maps |
| Animated arcs and arrows | D3.js d3-transition, SVG markers | Interaction, Perception |
| US bubble map | D3.js AlbersUSA, d3-scale | Maps, Marks and channels |
| Word count grid | D3.js d3-scale, SVG | Tabular data, Design |
| Scroll animations | IntersectionObserver, CSS | Interaction, Perception |
| Data preprocessing | Python, SQLite | - |

## Implementation Breakdown

### Core Visualization (MVP)

1. **Co-occurrence map** with automated country cycling, arc connections, travel line, side panel
2. **Front page trend map** with trend/year toggle, year slider, arrow transitions
3. **US city bubble map** with sqrt-scaled bubbles, hover tooltips
4. **Preprocessing pipeline** converting 2.2M articles into lightweight JSON via SQLite

### Extra Features

5. **Headline typewriter tooltips** in year mode showing actual NYT front page headlines
6. **Word count grid** showing article depth by country
7. **Background dot map** with spawn pings and ambient animation
8. **Typewriter section titles** with typo simulation
9. **Scroll-snap full-viewport layout** with dark theme

## Current Prototype Status

All core and extra visualizations are implemented and functional:

- Co-occurrence autoplay loops through countries with arc animations
- Front page map supports both trend and year modes with smooth transitions
- Year mode tooltip cycles real headlines with typewriter animation
- US bubble map renders 160 cities with correct projections
- Word count grid displays average article length by country
- Background dot map animates on the header page
- All sections trigger animations on scroll via IntersectionObserver
- Full preprocessing pipeline processes 2.2M articles in minutes
