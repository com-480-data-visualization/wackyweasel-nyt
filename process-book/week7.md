# Week 7 - March 30 - April 5, 2026

## Unified world map

This was the most time-consuming change of the entire project, but absolutely worth it. I merged all separate map sections into a single unified world map where the user cycles through modes: co-occurrence, trend arrows, year heatmap, US city bubbles with metro sub-zooms into NYC, LA, and SF, and finally an exit credits page. The result feels like an app rather than a scrolling website, and I really like how it turned out.

I also added a new year heatmap mode where each country is colored by its front page mention count for a selected year, using a choropleth with a slider to scrub through 2000-2023. The US city bubble map is now part of the world map too - when the user reaches it, the map smoothly zooms into the US by animating the SVG viewBox, and the city bubbles pop in with staggered transitions.

## Title and exit overlays

The header and a credits page were integrated as the first and last modes. Both are fixed-position overlays on top of the map. The main difficulty was event propagation - the overlays block wheel events from reaching the map underneath, so I had to attach the same scroll handler to all overlay elements independently.

## Mobile support

I added full touch support for mobile devices. On the title page, the user can swipe down or tap to enter. Navigation between modes uses tappable dots at the bottom of the screen. Countries and bubbles respond to tap instead of hover, with a tap-elsewhere-to-dismiss pattern. Tooltips appear as a fixed bar at the bottom of the screen, and the connection panel slides up as a bottom sheet.

![Desktop](images/slider_final.png){ width=58% } ![Mobile](images/slider_final_mobile.png){ width=28% }

*Left: Desktop with hover tooltips. Right: Mobile with horizontal scroll and navigation dots.*

The map is rendered wider than the viewport on mobile using a horizontal scroll container, so it has a usable size despite the portrait orientation. I also built a precision bubble selector for the US city map - the user toggles precision mode, then drags to aim at bubbles with the selection point offset above their finger, and the nearest bubble highlights. This was a lot more work than I initially thought it would be, but it works really well - the user can now precisely select even the smallest bubbles on a phone screen.

## AI disclosure

- Title/exit overlay integration and event propagation fixes were AI-assisted
- Mobile touch support (swipe navigation, tap interactions, precision bubble selector) was AI-assisted
