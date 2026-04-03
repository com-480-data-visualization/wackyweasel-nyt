# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Florian Hitz | 424415 |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (20th March, 5pm)

**10% of the final grade**

[See MILESTONE1.md](MILESTONE1.md) | [PDF](MILESTONE1.pdf)

## Milestone 2 (17th April, 5pm)

**10% of the final grade**

[See MILESTONE2.md](MILESTONE2.md) | [PDF](MILESTONE2.pdf)

## Milestone 3 (29th May, 5pm)

**80% of the final grade**

[Process Book PDF](process-book/process-book.pdf) | [Data (Polybox)](https://polybox.ethz.ch/index.php/s/9M5ZBsrq9CLWpyE) - NYT dataset, SQLite database, and processed JSON files


## Usage

```bash
# Serve locally
python3 -m http.server 8000
# Open http://localhost:8000
```

No build step, no npm, no bundler. Scroll or use arrow keys to navigate between visualization modes. On mobile, tap the navigation dots at the bottom.

### Preprocessing

The preprocessed JSON files are included in the repo. To regenerate from the SQLite database (download from Polybox link above):

```bash
# Country mentions + co-occurrence (~8-10 min)
python3 scripts/preprocess_countries.py

# Country mentions by section (~8-10 min)
python3 scripts/preprocess_country_sections.py

# Front page headlines per country/year (~2 min)
python3 scripts/preprocess_headlines.py

# US city mentions from glocations keywords (~1 min)
python3 scripts/preprocess_cities.py

# CSV to SQLite (only needed once if starting from raw CSV)
python3 scripts/csv_to_sqlite.py
```

### Controls

- **Scroll / Arrow keys**: Navigate between visualization modes
- **Hover** (desktop): Show country tooltips, co-occurrence arcs, sparklines
- **Tap** (mobile): Same interactions adapted for touch
- **Year slider** (heatmap mode): Scrub through 2000-2023, left/right arrow keys
- **Range slider** (trend mode): Select year range for trend computation, shift+arrows for start year
