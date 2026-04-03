# Week 3 - March 2-8, 2026

## Grid cartogram - average article word count by country

I wanted to create a different kind of map - the NYT itself often uses tile grid cartograms in their own visualizations, so it felt fitting. The tile grid gives every country an equal-sized square arranged in a layout that loosely preserves geographic adjacency, which avoids the problem of small countries being invisible on a geographic map. I used tile positions from the [Tile-Grid-Map](https://github.com/mustafasaifee42/Tile-Grid-Map) repository, which provides grid coordinates for 192 countries.

Each cell shows the average article word count for that country, colored on a sequential scale with a gradient color legend at the bottom. Hover tooltips show the country name, average word count, and total article count. This feature was later dismissed as it did not fit nicely into the scroll-driven flow of the final visualization.

## Small multiples - 25 yearly maps

I also experimented with a small multiples approach: 25 tiny choropleth maps, one per year, arranged in a grid. The idea was to let the user spot geographic coverage shifts over time at a glance. While it worked as a proof of concept, it consumed too much vertical space and the individual maps were too small to compare meaningfully. This led to the trend arrow approach in week 4. In retrospect, dismissing small multiples was the right call - the final storytelling approach relies on the map always being the same familiar canvas, with different data layers applied on top.

## AI disclosure

- The grid cartogram layout and D3.js cell rendering were developed with AI assistance
- The color legend implementation was AI-assisted
