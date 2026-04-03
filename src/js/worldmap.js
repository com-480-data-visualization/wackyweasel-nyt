// NYT World Map — Unified Co-occurrence + Front Page Visualization
// COM-480 - EPFL
// Modes: cooccurrence → trend → year (cycle with ↓ arrow key)

(function () {
    const isTouchPrimary = window.matchMedia('(pointer: coarse)').matches;
    const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
    const isMobile = isTouchPrimary && isSmallScreen;

    const MAP_WIDTH = 960;
    const MAP_HEIGHT = 500;
    const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

    // Data URLs
    const MENTIONS_URL = 'src/data/processed/country_mentions.json';
    const COOC_URL = 'src/data/processed/country_cooccurrence.json';
    const SECTIONS_URL = 'src/data/processed/country_sections.json';
    const HEADLINES_URL = 'src/data/processed/front_page_headlines.json';

    const NUMERIC_TO_ALPHA3 = {
        "004": "AFG", "008": "ALB", "010": "ATA", "012": "DZA", "024": "AGO", "032": "ARG",
        "036": "AUS", "040": "AUT", "031": "AZE", "044": "BHS", "048": "BHR",
        "050": "BGD", "051": "ARM", "052": "BRB", "056": "BEL", "064": "BTN", "068": "BOL",
        "070": "BIH", "072": "BWA", "076": "BRA", "084": "BLZ", "090": "SLB", "096": "BRN",
        "100": "BGR", "112": "BLR",
        "854": "BFA", "108": "BDI", "116": "KHM", "120": "CMR", "124": "CAN",
        "140": "CAF", "148": "TCD", "152": "CHL", "156": "CHN", "170": "COL",
        "178": "COG", "180": "COD", "188": "CRI", "191": "HRV", "192": "CUB",
        "196": "CYP", "203": "CZE", "204": "BEN", "208": "DNK", "262": "DJI", "214": "DOM",
        "218": "ECU", "818": "EGY", "222": "SLV", "226": "GNQ", "232": "ERI", "238": "FLK",
        "233": "EST", "231": "ETH", "242": "FJI", "246": "FIN", "250": "FRA", "260": "ATF",
        "266": "GAB", "270": "GMB", "268": "GEO", "276": "DEU", "288": "GHA",
        "300": "GRC", "304": "GRL", "320": "GTM", "324": "GIN", "328": "GUY", "332": "HTI",
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
        "540": "NCL", "548": "VUT",
        "586": "PAK", "591": "PAN", "598": "PNG", "600": "PRY", "604": "PER",
        "608": "PHL", "616": "POL", "620": "PRT", "624": "GNB", "626": "TLS", "630": "PRI", "634": "QAT",
        "642": "ROU", "643": "RUS", "646": "RWA", "682": "SAU", "686": "SEN",
        "688": "SRB", "694": "SLE", "702": "SGP", "703": "SVK", "705": "SVN",
        "706": "SOM", "710": "ZAF", "728": "SSD", "724": "ESP", "144": "LKA",
        "275": "PSE", "729": "SDN", "732": "ESH", "736": "SDN", "740": "SUR", "748": "SWZ", "752": "SWE", "756": "CHE",
        "760": "SYR", "158": "TWN", "762": "TJK", "834": "TZA", "764": "THA",
        "768": "TGO", "780": "TTO", "788": "TUN", "792": "TUR", "795": "TKM",
        "800": "UGA", "804": "UKR", "784": "ARE", "826": "GBR", "840": "USA",
        "858": "URY", "860": "UZB", "862": "VEN", "704": "VNM", "887": "YEM",
        "894": "ZMB", "716": "ZWE", "-99": "XKX"
    };

    const ALPHA3_TO_NAME = {
        "ATA": "Antarctica", "ARM": "Armenia", "BLZ": "Belize", "SLB": "Solomon Islands",
        "BLR": "Belarus", "BEN": "Benin", "FLK": "Falkland Islands", "ATF": "French Southern Territories",
        "NCL": "New Caledonia", "VUT": "Vanuatu", "GNB": "Guinea-Bissau", "TLS": "Timor-Leste",
        "PSE": "Palestine", "ESH": "Western Sahara", "GRL": "Greenland", "XKX": "Kosovo"
    };

    // Mode definitions
    const MODES = ['title', 'cooccurrence', 'trend', 'year', 'us', 'us-ny', 'us-la', 'us-sf', 'exit'];
    const MODE_TITLES = {
        cooccurrence: 'Which Countries Share Headlines?',
        trend: 'How Coverage Shifted Over Time',
        year: 'Who Makes the Front Page?',
        us: 'Where Does the NYT Report From?',
        'us-ny': 'New York City Metro',
        'us-la': 'Los Angeles Metro',
        'us-sf': 'San Francisco Bay Area'
    };
    const MODE_DESCRIPTIONS = {
        cooccurrence: 'Countries that appear together in NYT articles. Tap a country to see connections.',
        trend: 'How NYT front page country mentions shifted over 25 years. Arrows show the trend.',
        year: 'Front page mentions by year. Use the slider or arrow keys to browse.',
        us: 'City-level dateline mentions across 2.2M articles. Bigger bubble, more coverage.',
        'us-ny': '120,000+ articles mention New York City alone.',
        'us-la': 'Hollywood, Silicon Beach, and the West Coast news hub.',
        'us-sf': 'The Bay Area - tech capital and cultural hub.'
    };

    // Front page constants
    const SECTION = 'Front Page';
    const YEARS = d3.range(2000, 2025);
    const ARROW_MIN = 3;
    const ARROW_MAX = 45;
    const COLOR_INCREASE = '#3498db';
    const COLOR_DECREASE = '#e74c3c';
    const COLOR_STABLE = '#888';
    const STABLE_THRESHOLD = 0.01; // slope/mean ratio below which trend is "stable"
    const NO_DATA_COLOR = '#2a3555';
    const TOP_N = 10;

    const nearby = window.Typewriter.nearby;

    // State
    let currentMode = 'title';
    let currentYear = 2000;
    let svg, projection, pathGen;
    let centroids = {};
    let geoCentroids = {};  // lon/lat centroids for arc interpolation (cooccurrence)
    let headlineTimer = null;
    let isVisible = false;
    let US_VIEWBOX = '';
    const METRO_VIEWBOXES = {};

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
    let trendRangeMinEl, trendRangeMaxEl;
    let fpTotalByYear = [];
    let tappedCountryIso = null;
    let tappedCountryEl = null;

    // SVG layer groups
    let arcsGroup, arrowGroup, legend, bubblesGroup, statesGroup;

    // US city data
    let cityData = null;
    let cityRadiusScale, cityColorScale;

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

    const CITIES_URL = 'src/data/processed/us_city_mentions.json';
    const US_TOPO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

    async function init() {
        const [topo, mentions, cooc, sections, hdl, citiesRaw, usTopo] = await Promise.all([
            d3.json(TOPO_URL),
            d3.json(MENTIONS_URL),
            d3.json(COOC_URL).catch(() => null),
            d3.json(SECTIONS_URL),
            d3.json(HEADLINES_URL),
            d3.json(CITIES_URL),
            d3.json(US_TOPO_URL)
        ]);

        coocData = cooc;
        headlines = hdl;
        const cities = Array.isArray(citiesRaw) ? citiesRaw : citiesRaw.cities;
        const cityYears = Array.isArray(citiesRaw) ? null : citiesRaw.years;

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


        // Compute US bounding box for zoom mode
        const usFeature = topoCountries.find(f => f.id === '840');
        const usBounds = pathGen.bounds(usFeature);
        const usPad = 10;
        const usW = usBounds[1][0] - usBounds[0][0] + usPad * 2;
        const usH = usBounds[1][1] - usBounds[0][1] + usPad * 2;
        // Match the SVG aspect ratio so it doesn't distort
        const svgAspect = MAP_WIDTH / MAP_HEIGHT;
        let vbW, vbH;
        if (usW / usH > svgAspect) {
            vbW = usW;
            vbH = usW / svgAspect;
        } else {
            vbH = usH;
            vbW = usH * svgAspect;
        }
        const usCx = (usBounds[0][0] + usBounds[1][0]) / 2;
        const usCy = (usBounds[0][1] + usBounds[1][1]) / 2;
        US_VIEWBOX = `${usCx - vbW / 2} ${usCy - vbH / 2} ${vbW} ${vbH}`;

        // Compute centroids (both pixel and geo)
        topoCountries.forEach(f => {
            const iso3 = NUMERIC_TO_ALPHA3[f.id] || f.id;
            const pixelCentroid = pathGen.centroid(f);
            if (pixelCentroid && !isNaN(pixelCentroid[0])) {
                centroids[iso3] = pixelCentroid;
            }
            geoCentroids[iso3] = d3.geoCentroid(f);
        });

        // Compute total front page articles per year (for normalization)
        fpTotalByYear = YEARS.map(y => {
            const yi = yearToIndex[y];
            let sum = 0;
            Object.values(sectionLookup).forEach(c => {
                if (c.by_section[SECTION] && yi !== undefined) sum += (c.by_section[SECTION][yi] || 0);
            });
            return sum || 1; // avoid division by zero
        });

        // Compute trend data for front page modes (normalized by yearly total)
        topoCountries.forEach(f => {
            const iso3 = NUMERIC_TO_ALPHA3[f.id] || f.id;
            const centroid = centroids[iso3];
            if (!centroid) return;

            const c = sectionLookup[iso3];
            if (!c || !c.by_section[SECTION]) return;

            const sectionData = c.by_section[SECTION];
            const rawValues = YEARS.map(y => {
                const yi = yearToIndex[y];
                return yi !== undefined ? (sectionData[yi] || 0) : 0;
            });
            // Normalize: percentage of front page articles that mention this country
            const values = rawValues.map((v, i) => (v / fpTotalByYear[i]) * 100);

            const total = d3.sum(values);
            if (total === 0) return;

            const slope = linregSlope(values);
            trends.push({
                iso3, name: c.name, centroid, slope, total,
                absSlope: Math.abs(slope), values
            });
        });

        maxAbsSlope = d3.max(trends, d => d.absSlope) || 1;
        lengthScale = d3.scaleLinear()
            .domain([0, maxAbsSlope])
            .range([ARROW_MIN, ARROW_MAX]);

        // Arrow markers (for trend/year modes)
        const defs = svg.append('defs');
        ['increase', 'decrease', 'stable', 'year'].forEach(type => {
            const color = type === 'decrease' ? COLOR_DECREASE : type === 'stable' ? COLOR_STABLE : COLOR_INCREASE;
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
            .attr('stroke-width', 0.7)
            .on('mouseover', isMobile ? null : handleMouseOver)
            .on('mousemove', isMobile ? null : handleMouseMove)
            .on('mouseout', isMobile ? null : handleMouseOut);

        // Borders (land borders between countries)
        svg.append('path')
            .datum(mesh)
            .attr('class', 'country-border')
            .attr('d', pathGen)
            .attr('stroke-width', 0.7);

        // Coastlines (exterior borders)
        const coastline = topojson.mesh(topo, topo.objects.countries, (a, b) => a === b);
        svg.append('path')
            .datum(coastline)
            .attr('class', 'country-border')
            .attr('d', pathGen)
            .attr('stroke-width', 0.7);

        // Layer groups for each mode's overlay
        arcsGroup = svg.append('g').attr('class', 'arcs-group').attr('pointer-events', 'none');
        arrowGroup = svg.append('g').attr('class', 'trend-arrows');
        // US state borders (hidden, shown on US zoom)
        statesGroup = svg.append('g').attr('class', 'us-states-group').attr('opacity', 0);
        const usStates = topojson.feature(usTopo, usTopo.objects.states).features;
        statesGroup.selectAll('path')
            .data(usStates)
            .join('path')
            .attr('d', pathGen)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(52, 152, 219, 0.4)')
            .attr('stroke-width', 0.3)
            .attr('pointer-events', 'none');

        bubblesGroup = svg.append('g').attr('class', 'city-bubbles').attr('opacity', 0);

        // Project cities onto world map and draw bubbles
        cityData = cities
            .map(c => {
                const coords = projection([c.lon, c.lat]);
                return coords ? { ...c, x: coords[0], y: coords[1], _years: cityYears } : null;
            })
            .filter(Boolean);

        const countExtent = d3.extent(cityData, d => d.count);
        cityRadiusScale = d3.scaleSqrt().domain(countExtent).range([2.5, 25]);
        cityColorScale = d3.scaleSequentialLog(d3.interpolateYlOrRd).domain(countExtent);

        cityData.sort((a, b) => b.count - a.count);

        // Compute metro zoom viewboxes from projected city coordinates
        const metroRegions = {
            'us-ny': { lat: 40.7128, lon: -74.0060, radius: 8 },
            'us-la': { lat: 34.0522, lon: -118.2437, radius: 8 },
            'us-sf': { lat: 37.7749, lon: -122.4194, radius: 8 }
        };
        for (const [key, metro] of Object.entries(metroRegions)) {
            const center = projection([metro.lon, metro.lat]);
            if (center) {
                const r = metro.radius;
                const vbW = r * 2 * (MAP_WIDTH / MAP_HEIGHT > 1 ? MAP_WIDTH / MAP_HEIGHT : 1);
                const vbH = vbW / (MAP_WIDTH / MAP_HEIGHT);
                METRO_VIEWBOXES[key] = `${center[0] - vbW / 2} ${center[1] - vbH / 2} ${vbW} ${vbH}`;
            }
        }

        bubblesGroup.selectAll('circle')
            .data(cityData)
            .join('circle')
            .attr('class', 'city-bubble')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', 0)
            .attr('data-r', d => cityRadiusScale(d.count))
            .attr('fill', d => cityColorScale(d.count))
            .attr('stroke', 'none')
            .attr('opacity', 0)
            .on('mouseover', isMobile ? null : handleBubbleOver)
            .on('mousemove', isMobile ? null : handleMouseMove)
            .on('mouseout', isMobile ? null : handleBubbleOut);

        // Mobile touch handlers for countries and bubbles
        if (isMobile) {

            svg.selectAll('.country').on('touchstart', function (event, d) {
                event.stopPropagation();
                const iso3 = NUMERIC_TO_ALPHA3[d.id] || d.id;
                if (tappedCountryIso === iso3) {
                    // Tap same country again: dismiss
                    handleMouseOut.call(this);
                    tappedCountryIso = null;
                    tappedCountryEl = null;
                    return;
                }
                // Clear previous highlight
                if (tappedCountryEl) handleMouseOut.call(tappedCountryEl);
                tappedCountryIso = iso3;
                tappedCountryEl = this;
                handleMouseOver.call(this, event, d);
            }, { passive: false });

            // Precision bubble selector: toggle-gated, offset above finger
            let reticle = null;
            let reticleTarget = null;
            let precisionOn = false;
            const RETICLE_OFFSET = 80;
            const precisionBtn = document.getElementById('precision-toggle');

            if (precisionBtn) {
                precisionBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    precisionOn = !precisionOn;
                    precisionBtn.classList.toggle('active', precisionOn);
                });
            }

            function screenToSvg(clientX, clientY) {
                const svgEl = svg.node();
                const pt = svgEl.createSVGPoint();
                pt.x = clientX;
                pt.y = clientY;
                return pt.matrixTransform(svgEl.getScreenCTM().inverse());
            }

            function findNearestBubble(svgX, svgY) {
                let nearest = null, minDist = Infinity;
                bubblesGroup.selectAll('.city-bubble').each(function (d) {
                    const dx = d.x - svgX, dy = d.y - svgY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < minDist) { minDist = dist; nearest = { el: this, d, dist }; }
                });
                return nearest && nearest.dist < 15 ? nearest : null;
            }

            const worldContainer = document.getElementById('world-container');
            let precisionActive = false; // tracking if a precision drag is in progress

            worldContainer.addEventListener('touchstart', function (e) {
                if (!precisionOn) return;
                if (!(currentMode === 'us' || currentMode.startsWith('us-'))) return;
                if (e.touches.length !== 1) return;
                precisionActive = true;
                precisionDragged = false;
                reticleTarget = null;
            }, { passive: true });

            let precisionDragged = false;
            worldContainer.addEventListener('touchmove', function (e) {
                if (!precisionOn || !precisionActive) return;
                if (e.touches.length !== 1) return;
                e.preventDefault();
                precisionDragged = true;
                const svgPt = screenToSvg(e.touches[0].clientX, e.touches[0].clientY - RETICLE_OFFSET);
                const hit = findNearestBubble(svgPt.x, svgPt.y);
                bubblesGroup.selectAll('.city-bubble').each(function(d) {
                    d3.select(this).attr('fill', cityColorScale(d.count));
                });
                reticleTarget = hit;
                if (hit) d3.select(hit.el).attr('fill', 'white');
            }, { passive: false });

            let precisionJustSelected = false;
            worldContainer.addEventListener('touchend', function (e) {
                if (!precisionOn || !precisionActive) return;
                precisionActive = false;
                if (precisionDragged && reticleTarget) {
                    // Drag ended on a bubble: select it
                    precisionJustSelected = true;
                    handleBubbleOver.call(reticleTarget.el, e, reticleTarget.d);
                    setTimeout(() => { precisionJustSelected = false; }, 50);
                } else if (!precisionDragged) {
                    // Single tap: dismiss current selection
                    if (activeBubbleEl) {
                        handleBubbleOut.call(activeBubbleEl);
                        activeBubbleEl = null;
                    }
                    tooltip.style('opacity', 0);
                    precisionJustSelected = true;
                    setTimeout(() => { precisionJustSelected = false; }, 50);
                }
                reticleTarget = null;
            }, { passive: true });

            // Tap (not drag) elsewhere to dismiss tooltips and panel
            let dismissStartX = 0, dismissStartY = 0;
            document.addEventListener('touchstart', function (event) {
                dismissStartX = event.touches[0].clientX;
                dismissStartY = event.touches[0].clientY;
            }, { passive: true });
            document.addEventListener('touchend', function (event) {
                const dx = Math.abs(event.changedTouches[0].clientX - dismissStartX);
                const dy = Math.abs(event.changedTouches[0].clientY - dismissStartY);
                if (dx > 10 || dy > 10) return; // was a drag, not a tap
                const t = event.target;
                if (t.closest('.country') || t.closest('.city-bubble')) return;
                if (t.closest('#connection-panel') || t.closest('.tooltip')) return;
                if (t.closest('.mode-dot') || t.closest('#world-year-slider') || t.closest('#world-year-controls')) return;
                if (precisionJustSelected) return;
                if (tappedCountryEl) handleMouseOut.call(tappedCountryEl);
                tooltip.style('opacity', 0);
                tappedCountryIso = null;
                tappedCountryEl = null;
                if (currentMode === 'cooccurrence') clearCooccurrence();
            });

        }

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

        // Set initial mode (title overlay is shown by default)
        activateMode('title', false);

        // Keyboard navigation
        document.addEventListener('keydown', handleKeydown);

        // Wheel navigation: intercept scroll to change modes before leaving the section.
        // Temporarily disable scroll-snap while we're mid-mode so the browser doesn't
        // fight us, then re-enable it at the edges so normal snapping takes over.
        const worldSection = document.getElementById('world-visualization');
        let wheelCooldown = false;
        // Listen on both section and header (header overlay captures events when visible)
        const headerEl = document.querySelector('header');
        function handleWheel(e) {
            if ((!isVisible && currentMode !== 'title' && currentMode !== 'exit') || wheelCooldown) return;
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
        }
        worldSection.addEventListener('wheel', handleWheel, { passive: false });
        if (headerEl) headerEl.addEventListener('wheel', handleWheel, { passive: false });
        const exitEl = document.getElementById('exit-page');
        if (exitEl) exitEl.addEventListener('wheel', handleWheel, { passive: false });

        // Touch swipe for mode switching (mobile)
        if (isMobile) {
            let touchStartY = 0;
            let touchStartX = 0;
            const yearSliderEl = document.getElementById('world-year-slider');

            function handleTouchStart(e) {
                touchStartY = e.touches[0].clientY;
                touchStartX = e.touches[0].clientX;
            }
            function handleTouchMove(e) {
                // Allow scrolling inside panel and tooltip
                if (e.target.closest('#connection-panel') || e.target.closest('.tooltip')) return;
                // Prevent native scroll while swiping on the map
                const dy = Math.abs(e.touches[0].clientY - touchStartY);
                const dx = Math.abs(e.touches[0].clientX - touchStartX);
                if (dy > 10 && dy > dx) e.preventDefault();
            }
            function handleTouchEnd(e) {
                // Skip if scrolling inside panel, tooltip, or year slider
                if (e.target.closest('#connection-panel') || e.target.closest('.tooltip')) return;
                if (yearSliderEl && yearSliderEl.contains(e.target)) return;

                // On mobile, swipe only works on title (to dismiss) and exit (to go back)
                if (currentMode !== 'title' && currentMode !== 'exit') return;

                const deltaY = touchStartY - e.changedTouches[0].clientY;
                const deltaX = touchStartX - e.changedTouches[0].clientX;
                if (Math.abs(deltaY) < 40 || Math.abs(deltaY) < Math.abs(deltaX)) return;
                if (wheelCooldown) return;

                const idx = MODES.indexOf(currentMode);
                if (deltaY > 0 && idx < MODES.length - 1) {
                    wheelCooldown = true;
                    setTimeout(() => { wheelCooldown = false; }, 600);
                    document.documentElement.style.scrollSnapType = 'none';
                    activateMode(MODES[idx + 1], true);
                } else if (deltaY < 0 && idx > 0) {
                    wheelCooldown = true;
                    setTimeout(() => { wheelCooldown = false; }, 600);
                    document.documentElement.style.scrollSnapType = 'none';
                    activateMode(MODES[idx - 1], true);
                }
            }

            [worldSection, headerEl, exitEl].forEach(el => {
                if (!el) return;
                el.addEventListener('touchstart', handleTouchStart, { passive: true });
                el.addEventListener('touchmove', handleTouchMove, { passive: false });
                el.addEventListener('touchend', handleTouchEnd, { passive: true });
            });

            // Tap to dismiss title/exit overlays (skip if it was a swipe)
            let wasSwiped = false;
            const origTouchEnd = handleTouchEnd;
            handleTouchEnd = function(e) {
                const deltaY = touchStartY - e.changedTouches[0].clientY;
                wasSwiped = Math.abs(deltaY) > 40;
                origTouchEnd(e);
            };
            // Re-register with updated handler
            [worldSection, headerEl, exitEl].forEach(el => {
                if (!el) return;
                el.removeEventListener('touchend', origTouchEnd);
                el.addEventListener('touchend', handleTouchEnd, { passive: true });
            });

            if (headerEl) headerEl.addEventListener('click', () => {
                if (wasSwiped) { wasSwiped = false; return; }
                if (currentMode === 'title') activateMode('cooccurrence', true);
            });
            if (exitEl) exitEl.addEventListener('click', () => {
                if (wasSwiped) { wasSwiped = false; return; }
                if (currentMode === 'exit') activateMode('us-sf', true);
            });
        }

        // Mode dots: clickable navigation
        document.querySelectorAll('.mode-dot').forEach(dot => {
            dot.style.cursor = 'pointer';
            dot.addEventListener('click', () => {
                const mode = dot.dataset.mode;
                if (mode && mode !== currentMode) activateMode(mode, true);
            });
        });

        // Trend range slider
        trendRangeMinEl = document.getElementById('trend-range-min');
        trendRangeMaxEl = document.getElementById('trend-range-max');
        const trendRangeLabel = document.getElementById('trend-range-label');

        function recomputeTrends(minYear, maxYear) {
            const subYears = YEARS.filter(y => y >= minYear && y <= maxYear);
            if (subYears.length < 2) return;

            trends.length = 0;
            topoCountries.forEach(f => {
                const iso3 = NUMERIC_TO_ALPHA3[f.id] || f.id;
                const centroid = centroids[iso3];
                if (!centroid) return;
                const c = sectionLookup[iso3];
                if (!c || !c.by_section[SECTION]) return;
                const sectionData = c.by_section[SECTION];
                const rawValues = subYears.map(y => {
                    const yi = yearToIndex[y];
                    return yi !== undefined ? (sectionData[yi] || 0) : 0;
                });
                const subFpTotals = subYears.map(y => fpTotalByYear[YEARS.indexOf(y)] || 1);
                const values = rawValues.map((v, i) => (v / subFpTotals[i]) * 100);
                const total = d3.sum(values);
                if (total === 0) return;
                const slope = linregSlope(values);
                trends.push({
                    iso3, name: c.name, centroid, slope, total,
                    absSlope: Math.abs(slope), values
                });
            });
            maxAbsSlope = d3.max(trends, d => d.absSlope) || 1;
            lengthScale = d3.scaleLinear()
                .domain([0, maxAbsSlope])
                .range([ARROW_MIN, ARROW_MAX]);
        }

        if (trendRangeMinEl && trendRangeMaxEl) {
            function updateRangeTrack() {
                const min = 2000, max = 2023;
                let lo = +trendRangeMinEl.value, hi = +trendRangeMaxEl.value;
                if (lo > hi) { const tmp = lo; lo = hi; hi = tmp; }
                const pctLo = ((lo - min) / (max - min)) * 100;
                const pctHi = ((hi - min) / (max - min)) * 100;
                const active = 'rgba(52, 152, 219, 0.5)';
                const inactive = 'rgba(52, 152, 219, 0.05)';
                trendRangeMinEl.style.background = `linear-gradient(to right, ${inactive} ${pctLo}%, ${active} ${pctLo}%, ${active} ${pctHi}%, ${inactive} ${pctHi}%)`;
            }
            function updateTrendRange() {
                let minVal = +trendRangeMinEl.value;
                let maxVal = +trendRangeMaxEl.value;
                if (minVal > maxVal) { const tmp = minVal; minVal = maxVal; maxVal = tmp; }
                if (trendRangeLabel) trendRangeLabel.textContent = `${minVal} - ${maxVal}`;
                updateRangeTrack();
                recomputeTrends(minVal, maxVal);
                if (currentMode === 'trend') drawTrendArrows(false);
                // Refresh tooltip if a country is selected (mobile)
                if (tappedCountryEl) {
                    const d = d3.select(tappedCountryEl).datum();
                    handleMouseOver.call(tappedCountryEl, {}, d);
                }
            }
            trendRangeMinEl.addEventListener('input', updateTrendRange);
            trendRangeMaxEl.addEventListener('input', updateTrendRange);
            updateRangeTrack();
        }

        // Year slider
        const yearSlider = document.getElementById('world-year-slider');
        if (yearSlider) {
            yearSlider.addEventListener('input', () => {
                if (currentMode !== 'year') return;
                currentYear = +yearSlider.value;
                document.getElementById('world-year-label').textContent = currentYear;
                if (headlineTimer) { clearTimeout(headlineTimer); headlineTimer = null; }
                drawYearHeatmap(currentYear, false);
                // Refresh tooltip if a country is selected (mobile)
                if (tappedCountryEl) {
                    const d = d3.select(tappedCountryEl).datum();
                    handleMouseOver.call(tappedCountryEl, {}, d);
                } else {
                    tooltip.style('opacity', 0);
                }
            });
            // Block up/down on the slider so they don't change the value
            yearSlider.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                }
            });
        }

        // IntersectionObserver for scroll-triggered animation
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    isVisible = true;
                    // Skip scroll-in effects while title overlay is showing
                    if (currentMode === 'title') return;
                    // Type the title on each scroll-in
                    const h2 = document.querySelector('#world-visualization h2');
                    if (h2) typewriteTitle(h2, MODE_TITLES[currentMode]);
                    if (currentMode === 'trend') drawTrendArrows(true);
                    else if (currentMode === 'year') drawYearHeatmap(currentYear, true);
                    else if (currentMode === 'us' || currentMode.startsWith('us-')) showBubbles();
                } else {
                    isVisible = false;
                    collapseArrows();
                    clearCooccurrence();
                    hideBubbles(false);
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
        // Handle title overlay
        const header = document.querySelector('header');
        const bgMap = document.getElementById('bg-map');
        const exitPage = document.getElementById('exit-page');
        // Hide precision button on non-US modes
        const precisionToggle = document.getElementById('precision-toggle');
        if (precisionToggle && isMobile) {
            const isUS = mode === 'us' || mode.startsWith('us-');
            precisionToggle.style.display = isUS ? 'block' : 'none';
        }

        if (mode === 'title') {
            currentMode = mode;
            if (header) { header.style.opacity = '1'; header.style.pointerEvents = ''; }
            if (bgMap) bgMap.style.opacity = '0.65';
            if (exitPage) { exitPage.style.opacity = '0'; exitPage.style.pointerEvents = 'none'; }
            const dots = document.querySelector('.mode-dots');
            if (dots) dots.style.opacity = '0';
            document.querySelectorAll('.mode-dot').forEach(d => d.classList.toggle('active', d.dataset.mode === mode));
            return;
        }
        if (mode === 'exit') {
            currentMode = mode;
            if (header) { header.style.opacity = '0'; header.style.pointerEvents = 'none'; }
            if (bgMap) bgMap.style.opacity = '0';

            // Hide UI immediately
            const h2 = document.querySelector('#world-visualization h2');
            if (h2) h2.style.opacity = '0';
            const desc = document.getElementById('world-description');
            if (desc) desc.style.opacity = '0';
            const yearControls = document.getElementById('world-year-controls');
            if (yearControls) yearControls.style.opacity = '0';
            const trendControls2 = document.getElementById('world-trend-controls');
            if (trendControls2) trendControls2.style.opacity = '0';
            const dots = document.querySelector('.mode-dots');
            if (dots) dots.style.opacity = '0';
            tooltip.style('opacity', 0);
            hideBubbles(false, true);
            statesGroup.transition().duration(600).attr('opacity', 0);
            collapseArrows();
            clearCooccurrence();

            // Zoom out to full world
            svg.transition().duration(1400).ease(d3.easeCubicInOut)
                .attr('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
            svg.selectAll('.country')
                .transition().duration(1400)
                .attr('fill', 'transparent')
                .attr('stroke', 'rgba(100, 180, 255, 1)')
                .attr('stroke-width', 1);
            svg.selectAll('.country-border')
                .transition().duration(1400)
                .attr('stroke', 'rgba(100, 180, 255, 1)')
                .attr('stroke-width', 1);

            // Fade in exit overlay after zoom completes
            setTimeout(() => {
                if (currentMode === 'exit' && exitPage) {
                    exitPage.style.opacity = '1';
                    exitPage.style.pointerEvents = 'auto';
                }
            }, 1500);
            document.querySelectorAll('.mode-dot').forEach(d => d.classList.toggle('active', d.dataset.mode === mode));
            return;
        }
        // Hide both overlays
        if (header) { header.style.opacity = '0'; header.style.pointerEvents = 'none'; }
        if (bgMap) bgMap.style.opacity = '0';
        if (exitPage) { exitPage.style.opacity = '0'; exitPage.style.pointerEvents = 'none'; }
        // Restore UI elements hidden by exit mode
        const h2Restore = document.querySelector('#world-visualization h2');
        if (h2Restore) h2Restore.style.opacity = '';
        const descRestore = document.getElementById('world-description');
        if (descRestore) descRestore.style.opacity = '';
        const dotsRestore = document.querySelector('.mode-dots');
        if (dotsRestore) dotsRestore.style.opacity = '1';

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
        const trendControls = document.getElementById('world-trend-controls');
        if (trendControls) {
            trendControls.style.opacity = mode === 'trend' ? '1' : '0';
            trendControls.style.pointerEvents = mode === 'trend' ? 'auto' : 'none';
        }

        // Show/hide connection panel
        const panel = d3.select('#connection-panel');
        panel.style('display', 'none').style('opacity', 0);

        // Update mode indicator dots
        document.querySelectorAll('.mode-dot').forEach(dot => {
            dot.classList.toggle('active', dot.dataset.mode === mode);
        });

        const isUSMode = mode === 'us' || mode.startsWith('us-');

        if (isUSMode) {
            // Reset country colors from heatmap (don't restore fill-opacity, handled per sub-mode below)
            resetCountryFills(false);
            // Pick the right viewBox: full US or metro sub-zoom
            const targetVB = METRO_VIEWBOXES[mode] || US_VIEWBOX;
            const dur = animate ? 800 : 0;

            // Compute scale factor: ratio of target viewBox width to full map width
            const targetVBWidth = +targetVB.split(' ')[2];
            const bubbleScale = targetVBWidth / MAP_WIDTH;

            svg.transition().duration(dur).ease(d3.easeCubicInOut)
                .attr('viewBox', targetVB);

            statesGroup
                .transition().delay(animate ? 200 : 0).duration(300)
                .attr('opacity', 1);
            const stateBorderW = 0.6 * bubbleScale;
            statesGroup.selectAll('path')
                .transition().duration(dur)
                .attr('stroke-width', stateBorderW);
            if (mode.startsWith('us-')) {
                // Metro zoom: hide country paths entirely (state borders are sufficient)
                svg.selectAll('.country').transition().duration(dur).attr('stroke-width', 0).attr('fill-opacity', 0);
                svg.selectAll('.country-border').transition().duration(dur).attr('stroke-width', 0);
            } else {
                // US zoom: restore country borders at full width
                svg.selectAll('.country').attr('fill-opacity', 1).attr('stroke-width', 0.7);
                svg.selectAll('.country-border').attr('stroke-width', 0.7);
            }
            bubblesGroup
                .transition().delay(animate ? 300 : 0).duration(300)
                .attr('opacity', 1);

            // Only animate bubbles popping in on first entry to US mode
            if (mode === 'us' && animate) {
                bubblesGroup.selectAll('.city-bubble')
                    .attr('r', 0).attr('opacity', 0)
                    .transition()
                    .delay((d, i) => 400 + i * 8)
                    .duration(400)
                    .ease(d3.easeBackOut.overshoot(1.5))
                    .attr('r', function () { return +d3.select(this).attr('data-r') * bubbleScale; })
                    .attr('opacity', 0.75);
            } else {
                // Zoom transition (US full or metro sub-zoom): scale bubbles smoothly
                bubblesGroup.selectAll('.city-bubble')
                    .transition().duration(dur).ease(d3.easeCubicInOut)
                    .attr('r', function () { return +d3.select(this).attr('data-r') * bubbleScale; })
                    .attr('opacity', 0.75);
            }
        } else {
            // Leaving US mode: zoom back out, hide bubbles
            hideBubbles(animate);

            resetCountryFills();
            // Restore borders immediately (transitions get cancelled by drawYearHeatmap etc)
            svg.selectAll('.country').attr('stroke-width', 0.7).attr('fill-opacity', 1);
            svg.selectAll('.country-border').attr('stroke-width', 0.7);
            if (mode === 'trend') {
                if (isVisible) drawTrendArrows(animate);
            } else if (mode === 'year') {
                if (isVisible) drawYearHeatmap(currentYear, animate);
            }
        }
    }

    function hideBubbles(animate, skipViewBox) {
        const dur = animate ? 600 : 0;
        statesGroup.transition().duration(200).attr('opacity', 0);
        bubblesGroup.transition().duration(200).attr('opacity', 0);
        bubblesGroup.selectAll('.city-bubble')
            .interrupt()
            .attr('r', 0).attr('opacity', 0);
        if (!skipViewBox) {
            svg.transition().duration(dur).ease(d3.easeCubicInOut)
                .attr('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
            // Reset border widths
            svg.selectAll('.country').transition().duration(dur).attr('stroke-width', 0.7).attr('fill-opacity', 1);
            svg.selectAll('.country-border').transition().duration(dur).attr('stroke-width', 0.7);
        }
    }

    function resetCountryFills(restoreOpacity) {
        svg.selectAll('.country')
            .interrupt()
            .classed('country-selected', false)
            .attr('fill', NO_DATA_COLOR);
        if (restoreOpacity !== false) {
            svg.selectAll('.country').attr('fill-opacity', 1);
        }
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
            drawYearHeatmap(currentYear, false);
        } else if (currentMode === 'trend' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            if (!trendRangeMinEl || !trendRangeMaxEl) return;
            const delta = e.key === 'ArrowRight' ? 1 : -1;
            if (e.shiftKey) {
                // Shift + arrow: move start year
                const newVal = Math.max(2000, Math.min(2023, +trendRangeMinEl.value + delta));
                trendRangeMinEl.value = newVal;
            } else {
                // Arrow only: move end year
                const newVal = Math.max(2000, Math.min(2023, +trendRangeMaxEl.value + delta));
                trendRangeMaxEl.value = newVal;
            }
            trendRangeMinEl.dispatchEvent(new Event('input'));
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
        if (currentMode === 'us' || currentMode.startsWith('us-')) return;
        const iso3 = NUMERIC_TO_ALPHA3[d.id] || d.id;
        d3.select(this).classed('country-hover', true);

        const countryName = mentionLookup[iso3] ? mentionLookup[iso3].name : (ALPHA3_TO_NAME[iso3] || iso3);

        if (currentMode === 'cooccurrence') {
            if (!coocData || !coocData[iso3]) {
                tooltip.style('opacity', 1).html(`<strong>${countryName}</strong><br><span style="opacity:0.5">No co-occurrence data</span>`);
                return;
            }
            if (coocSelectedCountry === iso3) return;
            showConnections(iso3, event);
        } else if (currentMode === 'trend') {
            const t = trends.find(tr => tr.iso3 === iso3);
            if (!t) {
                tooltip.style('opacity', 1).html(`<strong>${countryName}</strong><br><span style="opacity:0.5">No front page data</span>`);
                return;
            }
            const tMean = t.total / t.values.length;
            const isStable = tMean > 0 ? (t.absSlope / tMean) < STABLE_THRESHOLD : true;
            const dir = isStable ? 'Stable' : (t.slope > 0 ? 'Increasing' : 'Decreasing');
            const color = isStable ? COLOR_STABLE : (t.slope > 0 ? COLOR_INCREASE : COLOR_DECREASE);
            const avgShare = (t.total / t.values.length).toFixed(2);
            tooltip.style('opacity', 1)
                .html(`<strong>${t.name}</strong><br>` +
                    `Avg. front page share: ${avgShare}%<br>` +
                    `Trend: <span style="color:${color};font-weight:600">${dir}</span>`);
            // Mini bar chart with trendline (uses current range)
            const rangeMin = trendRangeMinEl ? +trendRangeMinEl.value : 2000;
            const rangeMax = trendRangeMaxEl ? +trendRangeMaxEl.value : 2023;
            const chartYears = YEARS.filter(y => y >= Math.min(rangeMin, rangeMax) && y <= Math.max(rangeMin, rangeMax));
            const chartValues = t.values;
            const barColor = isStable ? 'rgba(136,136,136,0.5)' : (t.slope > 0 ? 'rgba(52,152,219,0.5)' : 'rgba(231,76,60,0.5)');
            const cw = 260, ch = 85, cm = { top: 8, right: 10, bottom: 18, left: 32 };
            const iw = cw - cm.left - cm.right, ih = ch - cm.top - cm.bottom;
            const chartSvg = tooltip.append('svg').attr('width', cw).attr('height', ch).style('display', 'block').style('margin-top', '6px');
            const cg = chartSvg.append('g').attr('transform', `translate(${cm.left},${cm.top})`);
            const cx = d3.scaleBand().domain(chartYears).range([0, iw]).padding(0.15);
            const cy = d3.scaleLinear().domain([0, d3.max(chartValues) || 0.001]).range([ih, 0]);
            // Y gridlines + labels
            cy.ticks(3).forEach(v => {
                cg.append('line')
                    .attr('x1', 0).attr('x2', iw)
                    .attr('y1', cy(v)).attr('y2', cy(v))
                    .attr('stroke', '#2a3555').attr('stroke-width', 0.5);
                const label = v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : Math.round(v);
                cg.append('text')
                    .attr('x', -4).attr('y', cy(v) + 3)
                    .attr('text-anchor', 'end')
                    .attr('font-size', '8px').attr('fill', '#6a7088')
                    .text(label + '%');
            });
            // Bars (animated grow from bottom)
            const n = chartValues.length;
            cg.selectAll('rect').data(chartValues).join('rect')
                .attr('x', (_, i) => cx(chartYears[i]))
                .attr('y', ih)
                .attr('width', cx.bandwidth())
                .attr('height', 0)
                .attr('fill', barColor)
                .transition().duration(400).delay((_, i) => i * 15)
                .attr('y', d => cy(d))
                .attr('height', d => ih - cy(d));
            // Trendline (animated draw)
            const yStart = d3.mean(chartValues.slice(0, Math.max(1, Math.ceil(n * 0.15))));
            const yEnd = d3.mean(chartValues.slice(-Math.max(1, Math.ceil(n * 0.15))));
            const trendLine = cg.append('line')
                .attr('x1', 0).attr('y1', cy(yStart))
                .attr('x2', 0).attr('y2', cy(yStart))
                .attr('stroke', color).attr('stroke-width', 1.5).attr('stroke-dasharray', '4,2');
            trendLine.transition().duration(600).delay(n * 15)
                .attr('x2', iw).attr('y2', cy(yEnd));
            // X-axis year labels
            [0, Math.floor(n / 2), n - 1].forEach(i => {
                if (i >= n) return;
                cg.append('text').attr('x', cx(chartYears[i]) + cx.bandwidth() / 2).attr('y', ih + 13)
                    .attr('text-anchor', 'middle').attr('font-size', '8px').attr('fill', '#999')
                    .text(chartYears[i]);
            });
        } else if (currentMode === 'year') {
            const c = sectionLookup[iso3];
            if (!c || !c.by_section[SECTION]) {
                tooltip.style('opacity', 1).html(`<strong>${countryName}</strong> (${currentYear})<br><span style="opacity:0.5">No front page data</span>`);
                return;
            }
            const yi = yearToIndex[currentYear];
            const val = yi !== undefined ? (c.by_section[SECTION][yi] || 0) : 0;
            const totalYear = fpTotalByYear[YEARS.indexOf(currentYear)] || 1;
            const pct = (val / totalYear * 100).toFixed(1);

            tooltip.style('opacity', 1)
                .html(`<strong>${countryName}</strong> (${currentYear})<br>` +
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
        if (isMobile) return;
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

    // ─── Bubble map mouse handlers ───

    const SPARK_W = 260, SPARK_H = 85;
    const SPARK_PAD = { top: 8, right: 10, bottom: 18, left: 32 };

    let activeBubbleEl = null;

    function handleBubbleOver(event, d) {
        // Clear previous bubble highlight
        if (activeBubbleEl) {
            d3.select(activeBubbleEl).attr('stroke', 'none').attr('fill', cityColorScale(d3.select(activeBubbleEl).datum().count));
        }
        activeBubbleEl = this;
        d3.select(this).attr('opacity', 1).attr('fill', 'white').attr('stroke', 'none');
        tooltip.html(`<strong>${d.city}, ${d.state}</strong><br>${d.count.toLocaleString()} articles`)
            .style('opacity', 1);
        if (d.pct_by_year) {
            const container = tooltip.append('div').style('margin-top', '6px');
            buildSparkline(container, d.pct_by_year, d._years);
        }
    }

    function handleBubbleOut() {
        const d = d3.select(this).datum();
        d3.select(this).attr('opacity', 0.75).attr('fill', cityColorScale(d.count)).attr('stroke', 'none');
        activeBubbleEl = null;
        tooltip.style('opacity', 0);
    }

    function buildSparkline(container, pctValues, years) {
        const w = SPARK_W, h = SPARK_H;
        const margin = SPARK_PAD;

        const sparkSvg = container.append('svg')
            .attr('width', w).attr('height', h)
            .style('display', 'block');

        const iw = w - margin.left - margin.right;
        const ih = h - margin.top - margin.bottom;

        const g = sparkSvg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
            .domain([0, pctValues.length - 1])
            .range([0, iw]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(pctValues) || 0.001])
            .range([ih, 0]);

        const lineGen = d3.line()
            .x((d, i) => x(i))
            .y(d => y(d));

        const areaGen = d3.area()
            .x((d, i) => x(i))
            .y0(ih)
            .y1(d => y(d));

        // Y-axis gridlines + labels
        y.ticks(3).forEach(v => {
            g.append('line')
                .attr('x1', 0).attr('x2', iw)
                .attr('y1', y(v)).attr('y2', y(v))
                .attr('stroke', '#2a3555').attr('stroke-width', 0.5);
            const label = v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : Math.round(v);
            g.append('text')
                .attr('x', -4).attr('y', y(v) + 3)
                .attr('text-anchor', 'end')
                .attr('font-size', 9).attr('fill', '#6a7088')
                .text(label + '%');
        });

        // X-axis labels
        if (years) {
            [0, Math.floor((years.length - 1) / 2), years.length - 1].forEach(i => {
                g.append('text')
                    .attr('x', x(i)).attr('y', ih + 13)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', 9).attr('fill', '#6a7088')
                    .text(years[i]);
            });
        }

        // Area fill (animated)
        g.append('path')
            .datum(pctValues)
            .attr('d', areaGen)
            .attr('fill', 'rgba(52,152,219,0.2)')
            .attr('opacity', 0)
            .transition().delay(800).duration(300)
            .attr('opacity', 1);

        // Line (animated draw)
        const linePath = g.append('path')
            .datum(pctValues)
            .attr('d', lineGen)
            .attr('fill', 'none')
            .attr('stroke', '#3498db')
            .attr('stroke-width', 2);

        const totalLen = linePath.node().getTotalLength();
        linePath
            .attr('stroke-dasharray', totalLen)
            .attr('stroke-dashoffset', totalLen)
            .transition().duration(1000).ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0);
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

    function showConnections(iso3, event) {
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

        showConnectionPanel(iso3, connections, event);
    }

    let sparkId = 0;

    function miniSparkline(values, delay) {
        const id = ++sparkId;
        const w = 70, h = 24;
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
            `<path d="${area}" fill="rgba(52,152,219,0.25)" style="opacity:0;animation:sf${id} 0.3s ${d + 600}ms forwards"/>` +
            `<path d="${line}" fill="none" stroke="#3498db" stroke-width="1.5" style="stroke-dasharray:${len};stroke-dashoffset:${len};animation:sd${id} 0.6s ${d}ms ease-out forwards"/>` +
            `</svg>`;
    }

    function showConnectionPanel(iso3, connections, event) {
        const panel = d3.select('#connection-panel');
        const sourceName = mentionLookup[iso3] ? mentionLookup[iso3].name : iso3;

        panel
            .style('display', 'block')
            .style('opacity', 0);

        // Position near mouse on desktop
        if (!isMobile && event) {
            panel
                .style('left', (event.pageX + 16) + 'px')
                .style('top', (event.pageY - 20) + 'px')
                .style('right', 'auto');
        }

        panel.html(
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
                const dMean = d.total / d.values.length;
                const isStable = dMean > 0 ? (d.absSlope / dMean) < STABLE_THRESHOLD : true;
                const angle = isStable ? 0 : (d.slope > 0 ? -45 : 45);
                const rad = angle * Math.PI / 180;
                const dx = Math.cos(rad) * len / 2;
                const dy = Math.sin(rad) * len / 2;
                const color = isStable ? COLOR_STABLE : (d.slope > 0 ? COLOR_INCREASE : COLOR_DECREASE);
                const markerType = isStable ? 'stable' : (d.slope > 0 ? 'increase' : 'decrease');

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

    function drawYearHeatmap(year, animate) {
        const yi = YEARS.indexOf(year);
        if (yi < 0) return;

        // Build lookup from original section data (not trend-range-filtered values)
        const valByCountry = {};
        let maxVal = 0;
        Object.entries(sectionLookup).forEach(([iso3, c]) => {
            if (!c.by_section[SECTION]) return;
            const sectionData = c.by_section[SECTION];
            const val = yearToIndex[year] !== undefined ? (sectionData[yearToIndex[year]] || 0) : 0;
            valByCountry[iso3] = val;
            if (val > maxVal) maxVal = val;
        });

        // Pow scale (exponent 0.3) spreads low values for better granularity
        const colorScale = d3.scaleSequentialPow(d3.interpolateYlOrRd)
            .exponent(0.3)
            .domain([0, maxVal || 1]);

        const duration = animate ? 600 : 200;

        svg.selectAll('.country')
            .transition().duration(duration)
            .attr('fill', function () {
                const iso3 = d3.select(this).attr('data-id');
                const val = valByCountry[iso3];
                return val > 0 ? colorScale(val) : NO_DATA_COLOR;
            })
            .attr('fill-opacity', 1);

        arrowGroup.selectAll('*').remove();
        legend.transition().duration(400).attr('opacity', 0);
    }

    function collapseArrows() {
        // Collapse trend arrows (lines)
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
