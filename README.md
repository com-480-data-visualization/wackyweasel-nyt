# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Florian Hitz | 424415 |

**Live demo**: [dataviz.02o.ch](https://dataviz.02o.ch)

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

# Or with Docker
docker build -t nyt-viz .
docker run -p 8000:8000 nyt-viz
```

No build step, no npm, no bundler. Vanilla JS + D3.js v7, static files only.

### Controls

- **Scroll / Arrow keys**: Navigate between visualization modes
- **Hover** (desktop): Show country tooltips, co-occurrence arcs, sparklines
- **Tap** (mobile): Same interactions adapted for touch
- **Year slider** (heatmap mode): Scrub through 2000-2023, left/right arrow keys
- **Range slider** (trend mode): Select year range for trend computation, shift+arrows for start year
- **Precision mode** (mobile, US maps): Toggle for accurate bubble selection

### Preprocessing

The preprocessed JSON files are included in the repo. To regenerate from the SQLite database (download from Polybox link above):

```bash
python3 scripts/preprocess_countries.py          # country mentions + co-occurrence (~8-10 min)
python3 scripts/preprocess_country_sections.py    # mentions by section (~8-10 min)
python3 scripts/preprocess_headlines.py           # front page headlines per country/year (~2 min)
python3 scripts/preprocess_cities.py              # US city mentions (~1 min)
python3 scripts/csv_to_sqlite.py                  # CSV to SQLite (only needed once)
```

### Process Book

```bash
cd process-book && bash build.sh    # builds title page (typst) + content (pandoc) + end page (typst)
```
