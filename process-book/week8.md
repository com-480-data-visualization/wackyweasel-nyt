# Week 8 - March 28, 2026

## Unified world map: single-page scroll navigation

The two separate world map sections (co-occurrence and front page trends) were merged into a single section with one shared SVG. The user scrolls or presses arrow keys to cycle through four modes without leaving the page: co-occurrence, trend arrows, year heatmap, and US city bubbles. A wheel event listener intercepts scroll input on the section and advances the mode instead of scrolling past. At the edges (first or last mode), the default scroll behavior resumes so the user can leave the section naturally.

Scroll-snap created friction during development. The browser's `scroll-snap-type: y mandatory` on the html element fights with programmatic scroll interception. The solution was to temporarily disable snap while the user is mid-mode (between the first and last), then re-enable it at the edges so normal snapping takes over for section-to-section navigation.

## Year mode: heatmap choropleth

The vertical blue arrows from the previous "By Year" mode were replaced with a choropleth heatmap. Each country is colored directly by its front page mention count for the selected year, using a log YlOrRd scale. A smooth 200ms D3 transition between years makes scrubbing the slider feel fluid. The slider's up/down arrow key events are blocked so they cycle modes instead of changing the year.

Before settling on the heatmap, two other approaches were tried and discarded. First, a vector field inspired by the D3 Observable wind map example, with small filled triangles colored by direction and sized by magnitude. This looked interesting but was confusing to read since the directional encoding (year-over-year change) was not intuitive on a world map. Second, an IDW-interpolated version that filled the entire landmass with triangles. This created visual artifacts on remote Pacific islands and was abandoned in favor of the much simpler and more readable choropleth.

## US city bubbles: zoom transition on the world map

The US city bubble map was absorbed into the unified world map as the fourth mode. Instead of a separate section with its own SVG and AlbersUSA projection, the city coordinates are now projected directly onto the Natural Earth world projection. When the user scrolls to US mode, the world map smoothly zooms into the continental United States by animating the SVG viewBox, and the city bubbles pop in on top of the country polygons with staggered easeBackOut transitions.

Centering the US in the zoomed view was unexpectedly tedious. The viewBox parameter controls a rectangular viewport in SVG coordinate space, and the mapping between viewBox values and the visual result is not intuitive. Increasing the Y offset moves the viewport down in SVG space, which shifts the visible content up on screen - the opposite of what you expect. The initial approach was manual: guessing viewBox values, refreshing, adjusting, repeating. After roughly a dozen iterations of nudging x, y, width, and height by hand, the US was still not properly centered.

The solution was to compute the viewBox programmatically from the US polygon's projected bounding box using `pathGen.bounds()`. This returns the pixel-space bounding rectangle of the US feature after projection. The viewBox is then derived by centering on the bounding box midpoint, adding padding, and adjusting the aspect ratio to match the SVG's width/height ratio so the zoom does not distort. This approach is projection-agnostic and would work for any country or region.

The sparkline tooltips were ported from the old bubblemap.js into the unified file. The original implementation serialized sparklines to HTML strings, but this broke D3 transitions since the transition timers are lost when an SVG element is serialized and reinserted via innerHTML. The fix was to append the sparkline as a live DOM node into the tooltip container using `d3.select().append()`, so transitions run normally.

## Shared typewriter utility

The typewriter effect was extracted from three separate implementations (inline script in index.html, worldmap.js headline tooltips, worldmap.js title typing) into a shared `typewriter.js` module exposed as `window.Typewriter`. The utility uses `d3.timeout()` for cancellable scheduling and `d3.select()` for DOM manipulation. Each call returns a promise with a `.cancel()` method for interrupting mid-type.

The world map section title is managed separately from other section titles. It needs to re-type on every mode change (not just on scroll intersection), so it is marked with `data-managed="true"` to exclude it from the global IntersectionObserver-based typewriter, and worldmap.js calls `Typewriter.typewrite()` directly on mode switches.

## Title and exit overlays

The header and a new credits page were integrated into the mode cycle as the first and last modes. Both are fixed-position overlays (z-index 100) that sit on top of the map section. Scrolling down from the title fades it out and reveals the first map mode. Scrolling past the last US metro mode triggers a zoom-out to the full world, transitions all country fills to transparent, brightens the borders, and then fades in a credits overlay showing the course name and year.

The main difficulty was event propagation. The fixed overlays sit above the map section in the DOM stacking order, so wheel events never reach the section's listener. The fix was to attach the same wheel handler to the header, exit overlay, and section elements independently.

A second issue was preventing the map from auto-advancing on page load. The IntersectionObserver fires immediately because the map section is visible behind the transparent header overlay. The fix was to check for `currentMode === 'title'` in the observer callback and skip activation.

## CSS vs SVG attribute precedence for stroke-width

Tuning country border thickness across zoom levels (world, US, metro) turned into an extended debugging session. D3 transitions set `stroke-width` via SVG attributes (`.attr('stroke-width', ...)`), but the CSS stylesheet also declared `stroke-width` on `.country` and `.country-border` classes. CSS property declarations take precedence over SVG presentation attributes, so the JavaScript transitions had no visible effect - the borders stayed at whatever the CSS value was, regardless of what D3 set.

The fix was to remove `stroke-width` from the CSS rules entirely and set the initial values as SVG attributes when the paths are first created. After that, all D3 transitions on stroke-width worked as expected.

## D3 transition conflicts on fill-opacity

Hiding country fills on metro zoom (where state borders are more precise) introduced another subtle bug. The code set `fill-opacity: 0` when entering metro mode, but the fill would not come back when returning to the US overview.

The cause was twofold. First, `resetCountryFills()` called `.interrupt()` on all country paths, which killed the in-flight transition from `hideBubbles()` that was restoring `fill-opacity`. The fix was to set `fill-opacity: 1` explicitly in `resetCountryFills` rather than relying on a transition that might get interrupted.

Second, switching between metro areas caused a brief fill flash. `resetCountryFills` set `fill-opacity: 1` synchronously before the metro branch could transition it back to 0. The fix was to add a parameter to `resetCountryFills` that skips the opacity restore when called from US mode code.

Third, setting `fill-opacity` and `stroke-width` in two separate `.transition()` calls on the same D3 selection caused the second transition to cancel the first. In D3, each element can only have one active unnamed transition at a time. The fix was to combine both attributes into a single `.transition()` call.

## Cleanup

The footer was removed. The word count grid section remains commented out. The old separate `cooccurrence.js` and `map.js` files are no longer loaded but remain on disk. `bubblemap.js` is also no longer loaded since its functionality was absorbed into `worldmap.js`.

## AI disclosure

- Unified world map architecture (mode switching, scroll interception, scroll-snap workaround) was AI-assisted
- Vector field and IDW interpolation experiments were AI-assisted
- Sparkline migration from HTML serialization to live DOM nodes was AI-assisted
- Typewriter utility extraction and D3 migration was AI-assisted
- Title/exit overlay integration and event propagation fixes were AI-assisted
- CSS vs SVG attribute precedence debugging was AI-assisted
- D3 transition conflict resolution (fill-opacity, stroke-width) was AI-assisted
