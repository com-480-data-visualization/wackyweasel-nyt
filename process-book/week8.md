# Week 8 - April 6-12, 2026

## Trend range slider

I added a dual-handle range slider to the trend arrow map that lets the user select a custom year range (e.g. 2005-2015) instead of always computing trends over the full 2000-2023 period. The arrows recompute in real time as the range changes, which makes it possible to discover patterns that are invisible in the full-range view. For example, Iraq's coverage spiked during the war years and declined after, and Ukraine only becomes significant after 2014.

The slider also supports keyboard control: arrow keys move the end year, shift+arrow moves the start year. The tooltip now shows a mini bar chart with the yearly front page share for the selected range and a dashed trendline.

## Stable trend detection

Countries with very small trends relative to their own average coverage now get a gray horizontal arrow instead of a colored diagonal one, indicating "stable" coverage. The threshold is based on the ratio of the slope to the country's mean. I also discovered that the raw article counts were misleading because the NYT's total output dropped from ~110k articles/year in 2000 to ~50k in 2023. All trend data is now normalized as a percentage of total front page articles per year, which removes this distortion.

## Missing country names

I discovered that several countries on the map were showing as numeric IDs (like "090" for Solomon Islands) because they were missing from the TopoJSON-to-ISO3 mapping. I added 32 missing country codes and a name fallback dictionary. I also found that the preprocessing script was missing several countries from its search dictionary (like Antarctica, Timor-Leste, and Solomon Islands among others). Both were fixed and the dataset was regenerated.

## AI disclosure

- Trend range slider with dual handles and keyboard control was AI-assisted
- Stable trend detection logic was AI-assisted
- Missing country identification and preprocessing updates were AI-assisted
