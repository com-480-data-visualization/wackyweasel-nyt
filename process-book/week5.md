# Week 5 - March 16-22, 2026

## Dark mode

I switched the page to a permanent dark theme. The dark palette immediately improved visual coherence. The map visualizations now blend into the page rather than sitting in conspicuous boxes.

## Co-occurrence map: automated exploration animation

I turned the co-occurrence map into a fully automated animation loop: a random country is selected and highlighted, connection arcs draw out one by one toward co-mentioned countries, and then a travel line moves to the next country. The cycle repeats indefinitely. Getting the timing right was the most time-consuming part. Early versions switched too abruptly, and the staged approach where arcs stay visible during the travel line was the key insight. This auto-mode was later dismissed as it decreases interactivity and does not let the user explore at their own pace.

## Background dot map: the landing page

I added a fixed-position SVG overlay that serves as the landing page. Country mention dots continuously spawn and fade across the map. Each dot appears at a random point inside its country, draws a thin line upward, and typewriters the country name. The idea is that it resembles a sneak peek of what is coming while being a nice visual touch before the user enters the actual visualizations.

## Scroll-snap and layout

I added scroll-snap globally so each section fills the viewport. This was later replaced by a more tile-like approach where the page stays more fixed, resulting in a more app-like feeling where the user cycles through views rather than scrolling between sections.

## AI disclosure

- Dark mode migration was AI-assisted
- Co-occurrence autoplay algorithm was AI-assisted
- Background dot map (spawn/fade lifecycle, geographic sampling, overlay positioning) was AI-assisted
