// NYT World Map — Unified Co-occurrence + Front Page Visualization
// COM-480 - EPFL
// Modes: cooccurrence → trend → year (cycle with ↓ arrow key)

(function () {
    const MAP_WIDTH = 960;
    const MAP_HEIGHT = 500;
    const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

    // Data URLs
    const MENTIONS_URL = 'src/data/processed/country_mentions.json';
    const COOC_URL = 'src/data/processed/country_cooccurrence.json';
    const SECTIONS_URL = 'src/data/processed/country_sections.json';
    const HEADLINES_URL = 'src/data/processed/front_page_headlines.json';

    const NUMERIC_TO_ALPHA3 = {
        "004": "AFG", "008": "ALB", "012": "DZA", "024": "AGO", "032": "ARG",
        "036": "AUS", "040": "AUT", "031": "AZE", "044": "BHS", "048": "BHR",
        "050": "BGD", "052": "BRB", "056": "BEL", "064": "BTN", "068": "BOL",
        "070": "BIH", "072": "BWA", "076": "BRA", "096": "BRN", "100": "BGR",
        "854": "BFA", "108": "BDI", "116": "KHM", "120": "CMR", "124": "CAN",
        "140": "CAF", "148": "TCD", "152": "CHL", "156": "CHN", "170": "COL",
        "178": "COG", "180": "COD", "188": "CRI", "191": "HRV", "192": "CUB",
        "196": "CYP", "203": "CZE", "208": "DNK", "262": "DJI", "214": "DOM",
        "218": "ECU", "818": "EGY", "222": "SLV", "226": "GNQ", "232": "ERI",
        "233": "EST", "231": "ETH", "242": "FJI", "246": "FIN", "250": "FRA",
        "266": "GAB", "270": "GMB", "268": "GEO", "276": "DEU", "288": "GHA",
        "300": "GRC", "320": "GTM", "324": "GIN", "328": "GUY", "332": "HTI",
        "340": "HND", "348": "HUN", "352": "ISL", "356": "IND", "360": "IDN",
        "364": "IRN", "368": "IRQ", "372": "IRL", "376": "ISR", "380": "ITA",
        "384": "CIV", "388": "JAM", "392": "JPN", "400": "JOR", "398": "KAZ",
        "404": "KEN", "408": "PRK", "410": "KOR", "414": "KWT", "417": "KGZ",
        "418": "LAO", "428": "LVA", "422": "LBN", "426": "LSO", "430": "LBR",
        "434": "LBY", "440": "LTU", "442": "LUX", "807": "MKD", "450": "MDG",
        "454": "MWI", "458": "MYS", "466": "MLI", "478": "MRT", "484": "MEX",
        "498": "MDA", "496": "MNG", "499": "MNE", "504": "MAR", "508": "MOZ",
        "104": "MMR", "516": "NAM", "524": "NPL", "528": "NLD", "554": "NZL",
        "558": "NIC", "562": "NER", "566": "NGA", "578": "NOR", "512": "OMN",
        "586": "PAK", "591": "PAN", "598": "PNG", "600": "PRY", "604": "PER",
        "608": "PHL", "616": "POL", "620": "PRT", "630": "PRI", "634": "QAT",
        "642": "ROU", "643": "RUS", "646": "RWA", "682": "SAU", "686": "SEN",
        "688": "SRB", "694": "SLE", "702": "SGP", "703": "SVK", "705": "SVN",
        "706": "SOM", "710": "ZAF", "728": "SSD", "724": "ESP", "144": "LKA",
        "729": "SDN", "736": "SDN", "740": "SUR", "748": "SWZ", "752": "SWE", "756": "CHE",
        "760": "SYR", "158": "TWN", "762": "TJK", "834": "TZA", "764": "THA",
        "768": "TGO", "780": "TTO", "788": "TUN", "792": "TUR", "795": "TKM",
        "800": "UGA", "804": "UKR", "784": "ARE", "826": "GBR", "840": "USA",
        "858": "URY", "860": "UZB", "862": "VEN", "704": "VNM", "887": "YEM",
        "894": "ZMB", "716": "ZWE", "-99": "XKX"
    };

    // Mode definitions
    const MODES = ['cooccurrence', 'trend', 'year'];
    const MODE_TITLES = {
        cooccurrence: 'Which Countries Share Headlines?',
        trend: 'Who Makes the Front Page?',
        year: 'Who Makes the Front Page?'
    };
    const MODE_DESCRIPTIONS = {
        cooccurrence: 'Countries that appear together in NYT articles. Hover over a country to see its connections.',
        trend: 'How NYT front page country mentions shifted over 25 years. Arrows show the trend.',
        year: 'Front page mentions by year. Use the slider or arrow keys to browse.'
    };

    // Front page constants
    const SECTION = 'Front Page';
    const YEARS = d3.range(2000, 2025);
    const ARROW_MIN = 14;
    const ARROW_MAX = 45;
    const COLOR_INCREASE = '#3498db';
    const COLOR_DECREASE = '#e74c3c';
    const NO_DATA_COLOR = '#2a3555';
    const TOP_N = 10;

    const nearby = window.Typewriter.nearby;

    // State
    let currentMode = 'cooccurrence';
    let currentYear = 2000;
    let svg, projection, pathGen;
    let centroids = {};
    let geoCentroids = {};  // lon/lat centroids for arc interpolation (cooccurrence)
    let headlineTimer = null;
    let isVisible = false;

    // Co-occurrence state
    let coocData = null;
    let mentionLookup = {};
    let coocGeneration = 0;
    let coocSelectedCountry = null;

    // Front page state
    let sectionLookup = {};
    let yearToIndex = {};
    let headlines = {};
    let trends = [];
    let maxAbsSlope = 1;
    let lengthScale;

    // SVG layer groups
    let arcsGroup, arrowGroup, legend;

    // Tooltip
    let tooltip;

    function linregSlope(values) {
        const n = values.length;
        if (n < 2) return 0;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            sumX += i; sumY += values[i]; sumXY += i * values[i]; sumX2 += i * i;
        }
        const denom = n * sumX2 - sumX * sumX;
        return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    }

    async function init() {
        const [topo, mentions, cooc, sections, hdl] = await Promise.all([
            d3.json(TOPO_URL),
            d3.json(MENTIONS_URL),
            d3.json(COOC_URL).catch(() => null),
            d3.json(SECTIONS_URL),
            d3.json(HEADLINES_URL)
        ]);

        coocData = cooc;
        headlines = hdl;

        // Build lookups
        mentions.countries.forEach(c => { mentionLookup[c.id] = c; });
        sections.countries.forEach(c => { sectionLookup[c.id] = c; });
        sections.years.forEach((y, i) => { yearToIndex[y] = i; });

        // SVG setup
        svg = d3.select('#world-svg')
            .attr('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        projection = d3.geoNaturalEarth1()
            .scale(155)
            .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

        pathGen = d3.geoPath().projection(projection);

        const topoCountries = topojson.feature(topo, topo.objects.countries).features;
        const mesh = topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b);

        // Compute centroids (both pixel and geo)
        topoCountries.forEach(f => {
            const iso3 = NUMERIC_TO_ALPHA3[f.id] || f.id;
            const pixelCentroid = pathGen.centroid(f);
            if (pixelCentroid && !isNaN(pixelCentroid[0])) {
                centroids[iso3] = pixelCentroid;
            }
            geoCentroids[iso3] = d3.geoCentroid(f);
        });

        // Compute trend data for front page modes
        topoCountries.forEach(f => {
            const iso3 = NUMERIC_TO_ALPHA3[f.id] || f.id;
            const centroid = centroids[iso3];
            if (!centroid) return;

            const c = sectionLookup[iso3];
            if (!c || !c.by_section[SECTION]) return;

            const sectionData = c.by_section[SECTION];
            const values = YEARS.map(y => {
                const yi = yearToIndex[y];
                return yi !== undefined ? (sectionData[yi] || 0) : 0;
            });

            const total = d3.sum(values);
            if (total === 0) return;

            const slope = linregSlope(values);
            trends.push({
                iso3, name: c.name, centroid, slope, total,
                absSlope: Math.abs(slope), values
            });
        });

        maxAbsSlope = d3.max(trends, d => d.absSlope) || 1;
        lengthScale = d3.scaleSqrt()
            .domain([0, maxAbsSlope])
            .range([ARROW_MIN, ARROW_MAX]);

        // Arrow markers (for trend/year modes)
        const defs = svg.append('defs');
        ['increase', 'decrease', 'year'].forEach(type => {
            const color = type === 'decrease' ? COLOR_DECREASE : COLOR_INCREASE;
            defs.append('marker')
                .attr('id', `arrow-${type}`)
                .attr('viewBox', '0 0 10 10')
                .attr('refX', 10).attr('refY', 5)
                .attr('markerWidth', 2.5).attr('markerHeight', 2.5)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M 0 0 L 10 5 L 0 10 z')
                .attr('fill', color);
        });

        // Tooltip (attached to body for correct positioning)
        d3.select('#world-tooltip').remove();
        tooltip = d3.select('body').append('div')
            .attr('id', 'world-tooltip')
            .attr('class', 'tooltip');

        // Draw country paths
        svg.append('g')
            .attr('class', 'countries')
            .selectAll('path')
            .data(topoCountries)
            .join('path')
            .attr('d', pathGen)
            .attr('class', 'country')
            .attr('data-id', d => NUMERIC_TO_ALPHA3[d.id] || d.id)
            .attr('fill', NO_DATA_COLOR)
            .on('mouseover', handleMouseOver)
            .on('mousemove', handleMouseMove)
            .on('mouseout', handleMouseOut);

        // Borders
        svg.append('path')
            .datum(mesh)
            .attr('class', 'country-border')
            .attr('d', pathGen);

        // Layer groups for each mode's overlay
        arcsGroup = svg.append('g').attr('class', 'arcs-group').attr('pointer-events', 'none');
        arrowGroup = svg.append('g').attr('class', 'trend-arrows');

        // Legend (for trend mode)
        legend = svg.append('g')
            .attr('class', 'trend-legend')
            .attr('transform', `translate(20, ${MAP_HEIGHT - 60})`)
            .attr('opacity', 0);

        legend.append('line')
            .attr('x1', 0).attr('y1', 15).attr('x2', 20).attr('y2', 0)
            .attr('stroke', COLOR_INCREASE).attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrow-increase)');
        legend.append('text')
            .attr('x', 28).attr('y', 10).text('Increasing coverage')
            .attr('font-size', '11px').attr('fill', '#8a8fa8');
        legend.append('line')
            .attr('x1', 0).attr('y1', 25).attr('x2', 20).attr('y2', 40)
            .attr('stroke', COLOR_DECREASE).attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrow-decrease)');
        legend.append('text')
            .attr('x', 28).attr('y', 35).text('Decreasing coverage')
            .attr('font-size', '11px').attr('fill', '#8a8fa8');

        // Set initial mode
        activateMode('cooccurrence', false);

        // Keyboard navigation
        document.addEventListener('keydown', handleKeydown);

        // Wheel navigation: intercept scroll to change modes before leaving the section.
        // Temporarily disable scroll-snap while we're mid-mode so the browser doesn't
        // fight us, then re-enable it at the edges so normal snapping takes over.
        const worldSection = document.getElementById('world-visualization');
        let wheelCooldown = false;
        worldSection.addEventListener('wheel', (e) => {
            if (!isVisible || wheelCooldown) return;
            const idx = MODES.indexOf(currentMode);

            if (e.deltaY > 0 && idx < MODES.length - 1) {
                e.preventDefault();
                document.documentElement.style.scrollSnapType = 'none';
                wheelCooldown = true;
                activateMode(MODES[idx + 1], true);
                setTimeout(() => {
                    wheelCooldown = false;
                    // Re-enable snap if we reached the last mode
                    if (MODES.indexOf(currentMode) === MODES.length - 1) {
                        document.documentElement.style.scrollSnapType = '';
                    }
                }, 600);
            } else if (e.deltaY < 0 && idx > 0) {
                e.preventDefault();
                document.documentElement.style.scrollSnapType = 'none';
                wheelCooldown = true;
                activateMode(MODES[idx - 1], true);
                setTimeout(() => {
                    wheelCooldown = false;
                    // Re-enable snap if we reached the first mode
                    if (MODES.indexOf(currentMode) === 0) {
                        document.documentElement.style.scrollSnapType = '';
                    }
                }, 600);
            } else {
                // At edge — make sure snap is re-enabled for normal scrolling
                document.documentElement.style.scrollSnapType = '';
            }
        }, { passive: false });

        // Year slider
        const yearSlider = document.getElementById('world-year-slider');
        if (yearSlider) {
            yearSlider.addEventListener('input', () => {
                currentYear = +yearSlider.value;
                document.getElementById('world-year-label').textContent = currentYear;
                if (headlineTimer) { clearTimeout(headlineTimer); headlineTimer = null; }
                tooltip.style('opacity', 0);
                drawYearArrows(currentYear, false);
            });
        }

        // IntersectionObserver for scroll-triggered animation
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    isVisible = true;
                    // Type the title on each scroll-in
                    const h2 = document.querySelector('#world-visualization h2');
                    if (h2) typewriteTitle(h2, MODE_TITLES[currentMode]);
                    if (currentMode === 'trend') drawTrendArrows(true);
                    else if (currentMode === 'year') drawYearArrows(currentYear, true);
                } else {
                    isVisible = false;
                    collapseArrows();
                    clearCooccurrence();
                    if (headlineTimer) { clearTimeout(headlineTimer); headlineTimer = null; }
                    if (activeTitle) { activeTitle.cancel(); activeTitle = null; }
                    // Clear title and re-enable scroll-snap
                    const h2 = document.querySelector('#world-visualization h2');
                    if (h2) { h2.textContent = ''; h2.classList.remove('typing'); }
                    document.documentElement.style.scrollSnapType = '';
                }
            });
        }, { threshold: 0.15 });

        observer.observe(worldSection);
    }

    // ─── Mode switching ───

    function activateMode(mode, animate) {
        // Clean up previous mode
        clearCooccurrence();
        collapseArrows();
        if (headlineTimer) { clearTimeout(headlineTimer); headlineTimer = null; }
        tooltip.style('opacity', 0);

        currentMode = mode;

        // Update title with typewriter effect
        const h2 = document.querySelector('#world-visualization h2');
        if (h2 && animate) {
            typewriteTitle(h2, MODE_TITLES[mode]);
        } else if (h2) {
            h2.textContent = MODE_TITLES[mode];
            h2.dataset.text = MODE_TITLES[mode];
        }

        const desc = document.getElementById('world-description');
        if (desc) desc.textContent = MODE_DESCRIPTIONS[mode];

        // Show/hide year controls (use opacity to avoid layout shift)
        const yearControls = document.getElementById('world-year-controls');
        if (yearControls) {
            yearControls.style.opacity = mode === 'year' ? '1' : '0';
            yearControls.style.pointerEvents = mode === 'year' ? 'auto' : 'none';
        }

        // Show/hide connection panel
        const panel = d3.select('#connection-panel');
        panel.style('display', 'none').style('opacity', 0);

        // Update mode indicator dots
        document.querySelectorAll('.mode-dot').forEach(dot => {
            dot.classList.toggle('active', dot.dataset.mode === mode);
        });

        // Draw the mode's content
        if (mode === 'cooccurrence') {
            // Just reset countries to base color, hover will trigger arcs
            resetCountryFills();
        } else if (mode === 'trend') {
            resetCountryFills();
            if (isVisible) drawTrendArrows(animate);
        } else if (mode === 'year') {
            resetCountryFills();
            if (isVisible) drawYearArrows(currentYear, animate);
        }
    }

    function resetCountryFills() {
        svg.selectAll('.country')
            .interrupt()
            .classed('country-selected', false)
            .attr('fill', NO_DATA_COLOR);
    }

    // ─── Keyboard handling ───

    function handleKeydown(e) {
        if (!isVisible) return;
        const section = document.getElementById('world-visualization');
        if (!section) return;
        const rect = section.getBoundingClientRect();
        if (rect.top > window.innerHeight * 0.5 || rect.bottom < window.innerHeight * 0.5) return;

        const idx = MODES.indexOf(currentMode);

        if (e.key === 'ArrowDown') {
            if (idx < MODES.length - 1) {
                e.preventDefault();
                activateMode(MODES[idx + 1], true);
            }
            // At last mode: let default scroll happen
        } else if (e.key === 'ArrowUp') {
            if (idx > 0) {
                e.preventDefault();
                activateMode(MODES[idx - 1], true);
            }
            // At first mode: let default scroll happen
        } else if (currentMode === 'year' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            const slider = document.getElementById('world-year-slider');
            if (e.key === 'ArrowRight' && currentYear < 2023) currentYear++;
            if (e.key === 'ArrowLeft' && currentYear > 2000) currentYear--;
            slider.value = currentYear;
            document.getElementById('world-year-label').textContent = currentYear;
            if (headlineTimer) { clearTimeout(headlineTimer); headlineTimer = null; }
            tooltip.style('opacity', 0);
            drawYearArrows(currentYear, false);
        }
    }

    // ─── Title typewriter ───

    let activeTitle = null;

    function typewriteTitle(el, text) {
        if (activeTitle) activeTitle.cancel();
        el.dataset.text = text;
        activeTitle = window.Typewriter.typewrite(el, text, 50, 0.06);
    }

    // ─── Mouse handlers (dispatch by mode) ───

    function handleMouseOver(event, d) {
        const iso3 = NUMERIC_TO_ALPHA3[d.id] || d.id;
        d3.select(this).classed('country-hover', true);

        if (currentMode === 'cooccurrence') {
            if (!coocData || !coocData[iso3]) return;
            if (coocSelectedCountry === iso3) return;
            showConnections(iso3);
        } else if (currentMode === 'trend') {
            const t = trends.find(tr => tr.iso3 === iso3);
            if (!t) return;
            const dir = t.slope > 0 ? 'Increasing' : 'Decreasing';
            const color = t.slope > 0 ? COLOR_INCREASE : COLOR_DECREASE;
            tooltip.style('opacity', 1)
                .html(`<strong>${t.name}</strong><br>` +
                    `Total front page mentions: ${t.total.toLocaleString()}<br>` +
                    `Trend: <span style="color:${color};font-weight:600">${dir}</span> ` +
                    `(slope: ${t.slope.toFixed(2)}/yr)`);
        } else if (currentMode === 'year') {
            const t = trends.find(tr => tr.iso3 === iso3);
            if (!t) return;
            const yi = yearToIndex[currentYear];
            const val = yi !== undefined ? (t.values[YEARS.indexOf(currentYear)] || 0) : 0;
            const totalYear = Object.values(sectionLookup).reduce((sum, c) => {
                if (!c.by_section[SECTION]) return sum;
                return sum + (c.by_section[SECTION][yi] || 0);
            }, 0);
            const pct = totalYear > 0 ? (val / totalYear * 100).toFixed(1) : '0.0';

            tooltip.style('opacity', 1)
                .html(`<strong>${t.name}</strong> (${currentYear})<br>` +
                    `Front page mentions: ${val.toLocaleString()}<br>` +
                    `Share: ${pct}%` +
                    `<div class="headline-line"></div>` +
                    `<span class="headline-text"></span>`);

            // Cycle headlines
            const countryHeadlines = headlines[iso3] && headlines[iso3][currentYear];
            if (countryHeadlines && countryHeadlines.length > 0) {
                let hIdx = 0;
                function cycleHeadline() {
                    const headlineEl = tooltip.select('.headline-text');
                    if (headlineEl.empty()) return;
                    const text = countryHeadlines[hIdx % countryHeadlines.length];
                    typewriteHeadline(headlineEl, text, 35);
                    hIdx++;
                    headlineTimer = setTimeout(cycleHeadline, text.length * 35 + 2000);
                }
                cycleHeadline();
            }
        }
    }

    function handleMouseMove(event) {
        tooltip.style('left', (event.pageX + 12) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }

    function handleMouseOut() {
        d3.select(this).classed('country-hover', false);
        tooltip.style('opacity', 0);
        if (headlineTimer) { clearTimeout(headlineTimer); headlineTimer = null; }
        if (currentMode === 'cooccurrence') {
            clearCooccurrence();
        }
    }

    // ─── Typewriter for headline tooltips ───

    function typewriteHeadline(selection, text, speed) {
        let i = 0;
        let displayed = '';
        const node = selection.node();
        if (!node) return;
        node.textContent = '';

        function tick() {
            if (i >= text.length) return;
            const ch = text[i];
            const keys = nearby[ch.toLowerCase()];
            if (keys && Math.random() < 0.07) {
                const wrong = keys[Math.floor(Math.random() * keys.length)];
                displayed += wrong;
                node.textContent = displayed;
                setTimeout(() => {
                    displayed = displayed.slice(0, -1);
                    node.textContent = displayed;
                    setTimeout(() => {
                        displayed += ch;
                        node.textContent = displayed;
                        i++;
                        setTimeout(tick, speed);
                    }, speed);
                }, speed * 3);
            } else {
                displayed += ch;
                node.textContent = displayed;
                i++;
                setTimeout(tick, speed);
            }
        }
        tick();
    }

    // ─── Co-occurrence mode ───

    function showConnections(iso3) {
        if (!coocData || !coocData[iso3]) return;

        const gen = ++coocGeneration;
        coocSelectedCountry = iso3;
        const connections = coocData[iso3].slice(0, TOP_N);

        const maxCount = connections[0].count;
        const coocColorScale = d3.scaleSequentialLog(d3.interpolateYlOrRd)
            .domain([1, maxCount]);

        arcsGroup.selectAll('*').interrupt().remove();

        const sourceCoord = geoCentroids[iso3];
        if (!sourceCoord) return;

        const strokeScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range([1, 4]);

        svg.selectAll('.country')
            .interrupt()
            .classed('country-selected', false)
            .attr('fill', NO_DATA_COLOR);

        svg.selectAll('.country')
            .filter(function () { return d3.select(this).attr('data-id') === iso3; })
            .classed('country-selected', true);

        connections.forEach((conn, i) => {
            const targetCoord = geoCentroids[conn.id];
            if (!targetCoord) return;

            const interp = d3.geoInterpolate(sourceCoord, targetCoord);
            const arcPoints = d3.range(0, 1.01, 0.02).map(t => interp(t));
            const lineGen = d3.geoPath().projection(projection);
            const geojson = { type: 'LineString', coordinates: arcPoints };

            const arcDelay = i * 80;
            const arcDuration = 600;

            const arcPath = arcsGroup.append('path')
                .attr('class', 'connection-arc')
                .attr('d', lineGen(geojson))
                .attr('stroke-width', strokeScale(conn.count))
                .attr('fill', 'none')
                .attr('data-target', conn.id);

            const totalLength = arcPath.node().getTotalLength();
            arcPath
                .attr('stroke-dasharray', totalLength)
                .attr('stroke-dashoffset', totalLength)
                .transition()
                .delay(arcDelay)
                .duration(arcDuration)
                .ease(d3.easeCubicOut)
                .attr('stroke-dashoffset', 0);

            setTimeout(() => {
                if (coocGeneration !== gen) return;
                svg.selectAll('.country')
                    .filter(function () { return d3.select(this).attr('data-id') === conn.id; })
                    .transition()
                    .duration(300)
                    .attr('fill', coocColorScale(conn.count));
            }, arcDelay + arcDuration);
        });

        showConnectionPanel(iso3, connections);
    }

    let sparkId = 0;

    function miniSparkline(values, delay) {
        const id = ++sparkId;
        const w = 60, h = 18;
        const max = Math.max(...values, 0.001);
        const n = values.length;
        const points = values.map((v, i) => {
            const x = (i / (n - 1)) * w;
            const y = h - (v / max) * h;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        });
        const line = 'M' + points.join('L');
        const area = line + ` L${w},${h} L0,${h} Z`;
        let len = 0;
        for (let i = 1; i < values.length; i++) {
            const dx = w / (n - 1);
            const dy = ((values[i] - values[i-1]) / max) * h;
            len += Math.sqrt(dx * dx + dy * dy);
        }
        len = Math.ceil(len);
        const d = delay || 0;
        return `<svg width="${w}" height="${h}" style="vertical-align:middle">` +
            `<style>` +
            `@keyframes sd${id} { from { stroke-dashoffset: ${len}; } to { stroke-dashoffset: 0; } }` +
            `@keyframes sf${id} { from { opacity: 0; } to { opacity: 1; } }` +
            `</style>` +
            `<path d="${area}" fill="rgba(52,152,219,0.15)" style="opacity:0;animation:sf${id} 0.3s ${d + 600}ms forwards"/>` +
            `<path d="${line}" fill="none" stroke="#3498db" stroke-width="1.2" style="stroke-dasharray:${len};stroke-dashoffset:${len};animation:sd${id} 0.6s ${d}ms ease-out forwards"/>` +
            `</svg>`;
    }

    function showConnectionPanel(iso3, connections) {
        const panel = d3.select('#connection-panel');
        const sourceName = mentionLookup[iso3] ? mentionLookup[iso3].name : iso3;

        panel
            .style('display', 'block')
            .style('opacity', 0)
            .html(
                `<div class="panel-header">
                    <strong>${sourceName}</strong>
                </div>
                <div class="panel-list">
                    ${connections.slice(0, TOP_N).map((c, i) => {
                        const cd = mentionLookup[c.id];
                        const spark = cd && cd.values ? miniSparkline(cd.values, i * 80) : '';
                        return `<div class="panel-row">
                            <span class="panel-rank">${i + 1}.</span>
                            <span class="panel-name">${c.name}</span>
                            <span class="panel-spark">${spark}</span>
                            <span class="panel-count">${c.count.toLocaleString()}</span>
                        </div>`;
                    }).join('')}
                </div>`
            )
            .transition()
            .duration(300)
            .style('opacity', 1);
    }

    function clearCooccurrence() {
        coocGeneration++;
        coocSelectedCountry = null;

        svg.selectAll('.country')
            .interrupt()
            .classed('country-selected', false)
            .transition()
            .duration(400)
            .attr('fill', NO_DATA_COLOR);

        arcsGroup.selectAll('*')
            .interrupt()
            .transition()
            .duration(300)
            .attr('stroke-opacity', 0)
            .remove();

        d3.select('#connection-panel')
            .transition()
            .duration(300)
            .style('opacity', 0)
            .on('end', function () {
                d3.select(this).style('display', 'none');
            });
    }

    // ─── Front page trend mode ───

    function drawTrendArrows(animate) {
        arrowGroup.selectAll('line').remove();

        const lines = arrowGroup.selectAll('line')
            .data(trends)
            .join('line')
            .each(function (d) {
                const len = lengthScale(d.absSlope);
                const angle = d.slope > 0 ? -45 : 45;
                const rad = angle * Math.PI / 180;
                const dx = Math.cos(rad) * len / 2;
                const dy = Math.sin(rad) * len / 2;
                const color = d.slope > 0 ? COLOR_INCREASE : COLOR_DECREASE;
                const markerType = d.slope > 0 ? 'increase' : 'decrease';

                const sel = d3.select(this)
                    .attr('stroke', color)
                    .attr('stroke-width', 2)
                    .attr('marker-end', `url(#arrow-${markerType})`)
                    .attr('pointer-events', 'none')
                    .datum({ ...d, dx, dy, len });

                if (animate) {
                    sel.attr('x1', d.centroid[0]).attr('y1', d.centroid[1])
                        .attr('x2', d.centroid[0]).attr('y2', d.centroid[1])
                        .attr('opacity', 0);
                } else {
                    sel.attr('x1', d.centroid[0] - dx).attr('y1', d.centroid[1] - dy)
                        .attr('x2', d.centroid[0] + dx).attr('y2', d.centroid[1] + dy)
                        .attr('opacity', 1);
                }
            });

        if (animate) {
            lines.transition()
                .delay((d, i) => i * 15)
                .duration(500)
                .attr('opacity', 1)
                .attr('x1', d => d.centroid[0] - d.dx)
                .attr('y1', d => d.centroid[1] - d.dy)
                .attr('x2', d => d.centroid[0] + d.dx)
                .attr('y2', d => d.centroid[1] + d.dy);
        }

        legend.transition().duration(400).attr('opacity', 1);
    }

    // ─── Front page year mode ───

    function drawYearArrows(year, animate) {
        const yi = YEARS.indexOf(year);
        if (yi < 0) return;

        const yearData = [];
        trends.forEach(d => {
            const val = d.values[yi] || 0;
            if (val === 0) return;
            yearData.push({ ...d, yearVal: val });
        });

        const maxVal = d3.max(yearData, d => d.yearVal) || 1;
        const yearLenScale = d3.scaleSqrt()
            .domain([0, maxVal])
            .range([ARROW_MIN, ARROW_MAX]);

        arrowGroup.selectAll('line').remove();

        const lines = arrowGroup.selectAll('line')
            .data(yearData)
            .join('line')
            .each(function (d) {
                const len = yearLenScale(d.yearVal);
                const sel = d3.select(this)
                    .attr('stroke', COLOR_INCREASE)
                    .attr('stroke-width', 2)
                    .attr('marker-end', 'url(#arrow-year)')
                    .attr('pointer-events', 'none')
                    .datum({ ...d, len });

                if (animate) {
                    sel.attr('x1', d.centroid[0]).attr('y1', d.centroid[1])
                        .attr('x2', d.centroid[0]).attr('y2', d.centroid[1])
                        .attr('opacity', 0);
                } else {
                    sel.attr('x1', d.centroid[0]).attr('y1', d.centroid[1])
                        .attr('x2', d.centroid[0]).attr('y2', d.centroid[1] - len)
                        .attr('opacity', 1);
                }
            });

        if (animate) {
            lines.transition()
                .delay((d, i) => i * 15)
                .duration(500)
                .attr('opacity', 1)
                .attr('x2', d => d.centroid[0])
                .attr('y2', d => d.centroid[1] - d.len);
        }

        legend.transition().duration(400).attr('opacity', 0);
    }

    function collapseArrows() {
        arrowGroup.selectAll('line')
            .transition().duration(300)
            .attr('x1', function () { const d = d3.select(this).datum(); return d ? d.centroid[0] : 0; })
            .attr('y1', function () { const d = d3.select(this).datum(); return d ? d.centroid[1] : 0; })
            .attr('x2', function () { const d = d3.select(this).datum(); return d ? d.centroid[0] : 0; })
            .attr('y2', function () { const d = d3.select(this).datum(); return d ? d.centroid[1] : 0; })
            .attr('opacity', 0);
        legend.transition().duration(300).attr('opacity', 0);
    }

    // ─── Boot ───

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('world-svg')) {
            init().catch(err => console.error('Failed to initialize world map:', err));
        }
    });
})();
