# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Florian Hitz | 424415 |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (20th March, 5pm)

**10% of the final grade**

### Dataset

> Find a dataset (or multiple) that you will explore. Assess the quality of the data it contains and how much preprocessing / data-cleaning it will require before tackling visualization. We recommend using a standard dataset as this course is not about scraping nor data processing.
>
> Hint: some good pointers for finding quality publicly available datasets ([Google dataset search](https://datasetsearch.research.google.com/), [Kaggle](https://www.kaggle.com/datasets), [OpenSwissData](https://opendata.swiss/en/), [SNAP](https://snap.stanford.edu/data/) and [FiveThirtyEight](https://data.fivethirtyeight.com/)).

**Source**: [NYT Articles: 2.1M+ (2000-Present) Daily Updated](https://www.kaggle.com/datasets/aryansingh0909/nyt-articles-21m-2000-present)

The New York Times Articles dataset from Kaggle contains **2.2 million articles** published between 2000 and 2025. The dataset is a single 4.3GB CSV with 20 columns including `headline`, `abstract`, `keywords` (JSON array with glocations, subjects, persons), `pub_date`, `section_name`, `print_section`, `print_page`, and `word_count`.

The data is high-quality with consistent formatting, structured metadata, and pre-categorized keywords. It spans 25 years of one of the world's most influential newspapers.

**Preprocessing**: I convert the CSV to SQLite for indexed querying, then run Python scripts that extract country mentions from headlines using dictionary-based regex. The alias dictionary maps 227 name variants (official names, common abbreviations, demonyms) to 150 ISO3 country codes, compiled manually to cover the naming conventions used in NYT articles. US city mentions are extracted from NYT `glocations` keyword tags. All values are normalized as percentage of total articles per year to account for declining publication volume. Output is lightweight JSON for D3.js.

### Problematic

> Frame the general topic of your visualization and the main axis that you want to develop.
> - What am I trying to show with my visualization?
> - Think of an overview for the project, your motivation, and the target audience.

**Topic**: How does the New York Times cover the world?

I analyze geographic patterns in NYT headlines across 24 years (2000-2023) to reveal which countries and cities receive attention, how coverage shifts over time, and which countries are mentioned together.

**Core questions**:

1. Which countries dominate NYT headlines, and how has that changed?
2. Which countries share headlines, and what are the co-occurrence patterns?
3. Where in the US does the NYT report from beyond New York City?
4. How does front page coverage trend for different countries?

**Target audience**: Anyone curious about media attention patterns, from journalism students to media researchers and the general public. The visualization is designed to be immediately explorable without instructions.

### Exploratory Data Analysis

> Pre-processing of the data set you chose
> - Show some basic statistics and get insights about the data

**Key statistics** (2.2M articles, 2000-2023): 267,000 articles mention at least one country in the headline, across 149 unique countries. The most mentioned are the United States (24k), China (24k), Iraq (16k), United Kingdom (15k), and Russia (14k). On the domestic side, 188,000 articles are tagged with a US city location, covering 160 unique cities. New York City dominates US coverage (121k articles), followed by Washington DC (15k) and Los Angeles (6k). Total article volume drops from ~110k/year in the early 2000s to ~50k/year in the 2020s, making normalization essential.

![NYT Article Volume and Country Mentions per Year](eda_article_counts.png)

I exclude 2024 and 2025 from the analysis because these years have incomplete data, which would skew normalized values and trend calculations. Note that 2023 also has fewer articles than previous years, but I kept it in the analysis since it still contains enough data to be meaningful.

**Insight**: Raw mention counts are misleading because NYT article volume halved over the period. Normalizing to percentage of total articles per year reveals that some countries (e.g. China, India) actually increased their share of coverage, even as raw counts declined.

### Related Work

> - What others have already done with the data?
> - Why is your approach original?
> - What source of inspiration do you take? Visualizations that you found on other websites or magazines (might be unrelated to your data).
> - In case you are using a dataset that you have already explored in another context (ML or ADA course, semester project...), you are required to share the report of that work to outline the differences with the submission for this class.

To my knowledge, no one has done a geographic analysis of NYT headlines at this scale before. The closest inspiration comes from Steven Pinker's *Enlightenment Now*, where he performs a sentiment analysis of news coverage to argue that media disproportionately focuses on negative events. My project takes a different angle by looking at *where* the NYT reports rather than *how*, but the idea of quantifying patterns hidden in plain sight in news coverage is similar. Furthermore, newspapers by nature focus on recent events, and past coverage is rarely revisited or analyzed. This makes a longitudinal view over 24 years particularly revealing, since it surfaces shifts in attention that no single reader would notice.

**Google Books Ngram Viewer** (books.google.com/ngrams): Tracks word frequency across digitized books over centuries. My project differs by focusing on geographic coverage patterns in journalism rather than general word frequency, and by using interactive maps rather than line charts.

**NYT Chronicle** (chronicle.nytlabs.com): The NYT's own archive exploration tool. It focuses on browsing articles by topic. My project quantifies geographic attention patterns across the full dataset and visualizes them spatially.

**My contribution**: Geographic focus (country co-occurrence networks, front page trend arrows, US city bubble maps) applied to the full 2.2M article corpus, with normalization for fair cross-year comparison. No prior work maps NYT geographic attention at this scale.

**Visualization inspiration**: My design choices are informed by dozens of interactive data stories and visualizations I encountered over time on platforms like Hacker News, whestere independent creators regularly publish creative geographic and temporal visualizations. Rather than following a single reference, I drew from this broad exposure to shape my scroll-driven, map-centric approach.

**Why the NYT?** Regular readers may not notice how frequently country names appear in NYT headlines. On any given day, multiple articles reference specific countries in their titles. From my own experience with other newspapers, this is far less common. The NYT's consistent international focus makes it uniquely suited for this kind of geographic analysis, and I want to make that hidden pattern visible.

This is a new exploration of this dataset, not reused from other courses.

## Milestone 2 (17th April, 5pm)

**10% of the final grade**

### Project Goal

I visualize how the New York Times covers the world by analyzing geographic patterns across 2.2 million articles (2000-2023). The visualization reveals which countries dominate headlines, how coverage shifts over time, which countries are mentioned together, and where in the US the NYT reports from beyond New York City. The site is a scroll-driven, dark-themed experience with five full-viewport sections, each answering a different question about NYT geographic attention.

Target audience: journalists, media researchers, and anyone curious about how one of the world's most influential newspapers distributes its attention across countries and cities.

### Visualizations

#### 1. Co-occurrence Map (Core)

Animated world map that cycles through countries, drawing arc connections to the countries most frequently co-mentioned in the same articles. A red travel line moves between countries, and a side panel ranks the top co-mentioned partners.

**Interaction**: Fully automated animation that loops indefinitely. Arcs are color-coded by impact (article count).

**Tools**: D3.js (d3-geo, d3-transition), TopoJSON, Natural Earth
**Lectures**: Maps, Interaction, Perception

#### 2. Front Page Trend Map (Core)

World map with two toggle modes:

- **Trend**: Diagonal arrows per country showing whether front page mentions increased or decreased over 2000-2023. Blue arrows point up-right (increasing), red arrows point down-right (decreasing). Arrow length is sqrt-scaled by slope magnitude.
- **By Year**: Vertical arrows showing each country's front page mention percentage for a selected year. A slider scrubs through 2000-2023. Hovering a country triggers a typewriter-animated tooltip cycling through actual NYT headlines from that country and year.

**Interaction**: Toggle buttons switch modes. Year slider with smooth arrow transitions. Hover tooltips with headline cycling.

**Tools**: D3.js (d3-geo, d3-transition, d3-scale), TopoJSON, SVG markers
**Lectures**: Maps, Interaction, Marks and channels

#### 3. US City Bubble Map (Core)

AlbersUSA projection with sqrt-scaled bubbles at each city mentioned in NYT datelines. New York City and Washington DC dominate, but the map reveals surprising secondary cities. Hover tooltips show exact article counts.

**Tools**: D3.js (d3-geo, d3-scale), TopoJSON (US states), AlbersUSA projection
**Lectures**: Maps, Practical maps, Perception

#### 4. Word Count by Country Grid (Extra)

Grid cartogram showing average article word count by mentioned country. Darker cells indicate longer average articles. Reveals which countries receive deeper coverage vs brief mentions.

**Tools**: D3.js (d3-scale), SVG
**Lectures**: Tabular data, Marks and channels

#### 5. Background Dot Map + Typewriter Effects (Extra)

Fixed SVG overlay on the header showing animated dots spawning at random country locations with bright ping animations, line draw-up, and typewriter country name labels. Dots fade to 50% then collapse. Creates an ambient data-art introduction.

Section titles use a typewriter effect with typo simulation (nearby-key errors that get corrected), re-triggering on each scroll.

**Tools**: D3.js, CSS animations, IntersectionObserver
**Lectures**: Perception, Design

### Tools and Lectures Summary

| Component | Tools | Relevant Lectures |
|-----------|-------|-------------------|
| World maps (co-occurrence, front page) | D3.js d3-geo, TopoJSON | Maps, Practical maps |
| Animated arcs and arrows | D3.js d3-transition, SVG markers | Interaction, Perception |
| US bubble map | D3.js AlbersUSA, d3-scale | Maps, Marks and channels |
| Word count grid | D3.js d3-scale, SVG | Tabular data, Design |
| Scroll animations | IntersectionObserver, CSS | Interaction, Perception |
| Data preprocessing | Python, SQLite | - |

### Implementation Breakdown

**Core Visualization (MVP)**

1. **Co-occurrence map** with automated country cycling, arc connections, travel line, side panel
2. **Front page trend map** with trend/year toggle, year slider, arrow transitions
3. **US city bubble map** with sqrt-scaled bubbles, hover tooltips
4. **Preprocessing pipeline** converting 2.2M articles into lightweight JSON via SQLite

**Extra Features**

5. **Headline typewriter tooltips** in year mode showing actual NYT front page headlines
6. **Word count grid** showing article depth by country
7. **Background dot map** with spawn pings and ambient animation
8. **Typewriter section titles** with typo simulation
9. **Scroll-snap full-viewport layout** with dark theme

### Current Prototype Status

All core and extra visualizations are implemented and functional:

- Co-occurrence autoplay loops through countries with arc animations
- Front page map supports both trend and year modes with smooth transitions
- Year mode tooltip cycles real headlines with typewriter animation
- US bubble map renders 160 cities with correct projections
- Word count grid displays average article length by country
- Background dot map animates on the header page
- All sections trigger animations on scroll via IntersectionObserver
- Full preprocessing pipeline processes 2.2M articles in minutes

## Milestone 3 (29th May, 5pm)

**80% of the final grade**


## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone
