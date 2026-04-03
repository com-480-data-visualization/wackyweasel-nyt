# Week 6 - March 23-29, 2026

## Typewriter effect

I added a typewriter animation to all text headings. The header title, subtitles, and section titles all type out character by character. The effect re-triggers on each scroll - when a section leaves the viewport, its title is cleared, and when it re-enters, the typewriter runs again.

To make the effect feel more human, I added a typo simulation. I once read an article on Hacker News where this idea was introduced, but I could not find it again. Each character has a small probability of being mistyped using a nearby-key map. When a typo occurs, the wrong character appears briefly, gets deleted, and the correct character is typed - mimicking a real person catching and correcting a mistake.

I applied the same approach to the background dot map's country name labels, where each label types out letter by letter after the connecting line finishes drawing.

## Co-occurrence map - hover interaction

I reworked the co-occurrence map from the automated animation to a hover-triggered interaction. The map now responds to the user hovering over a country, drawing connection arcs to the top 10 co-mentioned countries. When the mouse leaves, everything fades back. I added a generation counter to prevent animation interleaving when the user moves quickly between countries.

The tooltip was expanded into a side panel showing the country name, total headline mentions, an animated sparkline of coverage over time, and a ranked list of the top co-mentioned countries.

## Front page map and bubble map improvements

The trend arrow map and US city bubble map both received animated sparkline tooltips showing yearly coverage percentages. The bubble map now dims all other bubbles when hovering over a city, creating a spotlight effect.

![Original sketch](images/world-map.png){ width=48% } ![Final implementation](images/headlines_final.png){ width=48% }

*Left: Original sketch from milestone 2. Right: Final implementation with hover-triggered arcs and connection panel.*

## Data normalization

Investigating the trend arrows revealed that almost every country showed decreasing coverage. This turned out to be because the NYT published roughly 110,000 articles per year in the early 2000s but only around 50,000 in recent years. I updated all preprocessing to normalize counts as a percentage of total articles per year. For consistency, dates 2024 and 2025 are excluded from all data throughout this report.
## AI disclosure

- Typewriter effect with typo simulation was fully AI-orchestrated
- Co-occurrence hover interaction and sparkline tooltips were AI-assisted
- Data normalization pipeline was AI-assisted
