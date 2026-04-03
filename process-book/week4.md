# Week 4 - March 9-15, 2026

## Coverage trend map - replacing small multiples with direction arrows

The 25-tile small multiples grid from week 3 had problems: it consumed too much vertical space, and comparing subtle year-over-year shifts across tiny maps was difficult. I replaced it with a single map where each country displays a directional arrow showing whether its Front Page coverage increased or decreased over 2000-2023.

![Small multiples POC](images/poc_25tiles.png){ width=48% } ![Vector field POC](images/poc_vectors.png){ width=48% }

![Final trend arrow map](images/vector_final.png){ width=48% } ![NYT voter shift inspiration](images/nyt_voters_shift.png){ width=48% }

*Top left: Small multiples POC. Top right: Vector field POC. Bottom left: Final trend arrow map - the dark mode really adds a professional glow to it. Bottom right: [NYT election arrow map](https://www.nytimes.com/interactive/2024/11/06/us/politics/presidential-election-2024-red-shift.html) that inspired the approach.*

The approach is inspired by New York Times election graphics, which use arrow maps to show shifts in voting patterns - arrows on a map are an effective way to encode direction and magnitude of change without requiring the reader to compare multiple snapshots.

For each country, I compute a linear regression slope across 25 data points. The slope sign determines the arrow direction: positive slopes point up-right (increasing), negative slopes point down-right (decreasing). Arrow length is scaled from the absolute slope.

The result shows roughly what you would expect: Iraq and Afghanistan have declining arrows (peak coverage during the wars, then fading), while countries like Ukraine and China show increasing coverage. The single-map format is far more scannable and communicates the story more directly.

## Co-occurrence map - first version

I also started working on the co-occurrence map, which shows which countries are mentioned together in the same NYT articles. The initial version lets the user click a country to see arc connections to the countries most frequently co-mentioned with it. This became the main focus of the following weeks.

## AI disclosure

- The trend computation (linear regression) was AI-assisted
- Arrow positioning and SVG marker placement were buggy initially and fixed with AI assistance
