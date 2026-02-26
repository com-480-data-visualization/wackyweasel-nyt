// NYT Country Co-occurrence — Interactive World Map
// COM-480 - EPFL

(function () {
    const MAP_WIDTH = 960;
    const MAP_HEIGHT = 500;
    const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
    const DATA_URL = 'src/data/processed/country_mentions.json';
    const COOC_URL = 'src/data/processed/country_cooccurrence.json';

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
        "736": "SDN", "740": "SUR", "748": "SWZ", "752": "SWE", "756": "CHE",
        "760": "SYR", "158": "TWN", "762": "TJK", "834": "TZA", "764": "THA",
        "768": "TGO", "780": "TTO", "788": "TUN", "792": "TUR", "795": "TKM",
        "800": "UGA", "804": "UKR", "784": "ARE", "826": "GBR", "840": "USA",
        "858": "URY", "860": "UZB", "862": "VEN", "704": "VNM", "887": "YEM",
        "894": "ZMB", "716": "ZWE", "-99": "XKX"
    };

    const NO_DATA_COLOR = '#2a3555';

    let coocData = null;
    let selectedCountry = null;
    let svg, projection, path, tooltip;
    let countryLookup = {};
    let centroids = {};

    let autoplayTimer = null;
    let autoplayActive = false;

    async function initMap() {
        const [topo, mentions, cooc] = await Promise.all([
            d3.json(TOPO_URL),
            d3.json(DATA_URL),
            d3.json(COOC_URL).catch(() => null)
        ]);

        coocData = cooc;

        mentions.countries.forEach(c => {
            countryLookup[c.id] = c;
        });

        svg = d3.select('#cooc-svg')
            .attr('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        projection = d3.geoNaturalEarth1()
            .scale(155)
            .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

        path = d3.geoPath().projection(projection);
        d3.select('#cooc-tooltip').remove();
        tooltip = d3.select('body').append('div')
            .attr('id', 'cooc-tooltip')
            .attr('class', 'tooltip');

        const countries = topojson.feature(topo, topo.objects.countries).features;

        countries.forEach(f => {
            const iso3 = NUMERIC_TO_ALPHA3[f.id] || f.id;
            centroids[iso3] = d3.geoCentroid(f);
        });

        svg.append('g')
            .attr('class', 'countries')
            .selectAll('path')
            .data(countries)
            .join('path')
            .attr('d', path)
            .attr('class', 'country')
            .attr('data-id', d => NUMERIC_TO_ALPHA3[d.id] || d.id)
            .attr('fill', NO_DATA_COLOR);

        svg.append('path')
            .datum(topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b))
            .attr('class', 'country-border')
            .attr('d', path);

        svg.append('g').attr('class', 'arcs-group');

        // Start autoplay when section is visible
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !autoplayActive) {
                    startAutoplay();
                } else if (!entry.isIntersecting && autoplayActive) {
                    stopAutoplay();
                }
            });
        }, { threshold: 0.3 });

        observer.observe(document.getElementById('cooc-visualization'));
    }

    function showConnections(iso3, skipReset) {
        if (!coocData || !coocData[iso3]) return;

        selectedCountry = iso3;
        const connections = coocData[iso3];
        const connLookup = {};
        connections.forEach(c => { connLookup[c.id] = c.count; });

        const maxCount = connections[0].count;
        const coocColorScale = d3.scaleSequentialLog(d3.interpolateYlOrRd)
            .domain([1, maxCount]);

        const arcsGroup = svg.select('.arcs-group');
        const sourceCoord = centroids[iso3];
        if (!sourceCoord) return;

        const strokeScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range([1, 4]);

        if (!skipReset) {
            // Fresh start: reset everything
            svg.selectAll('.country')
                .classed('country-selected', false)
                .transition()
                .duration(500)
                .attr('fill', function () {
                    const id = d3.select(this).attr('data-id');
                    return NO_DATA_COLOR;
                });

            arcsGroup.selectAll('*')
                .transition()
                .duration(400)
                .attr('stroke-opacity', 0)
                .remove();
        }

        svg.selectAll('.country')
            .classed('country-selected', function () {
                return d3.select(this).attr('data-id') === iso3;
            });

        // Draw arcs and color on impact
        setTimeout(() => {
            connections.forEach((conn, i) => {
                const targetCoord = centroids[conn.id];
                if (!targetCoord) return;

                const interp = d3.geoInterpolate(sourceCoord, targetCoord);
                const arcPoints = d3.range(0, 1.01, 0.02).map(t => interp(t));
                const lineGen = d3.geoPath().projection(projection);
                const geojson = { type: 'LineString', coordinates: arcPoints };

                const arcDelay = i * 120;
                const arcDuration = 800;

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

                // Color the target country when the arc arrives
                setTimeout(() => {
                    svg.selectAll('.country')
                        .filter(function () {
                            return d3.select(this).attr('data-id') === conn.id;
                        })
                        .transition()
                        .duration(300)
                        .attr('fill', coocColorScale(conn.count));
                }, arcDelay + arcDuration);
            });

            // Show panel after first few arcs land
            setTimeout(() => {
                showConnectionPanel(iso3, connections);
            }, 3 * 120 + 800);
        }, skipReset ? 300 : 700);
    }

    // Teardown: draw red travel line over existing arcs, on impact switch context
    function teardownTo(nextIso3, callback) {
        const arcsGroup = svg.select('.arcs-group');
        const fromIso3 = selectedCountry;

        const sourceCoord = centroids[fromIso3];
        const targetCoord = centroids[nextIso3];
        if (!sourceCoord || !targetCoord) { callback(); return; }

        // Draw red travel line on top of existing blue arcs
        const interp = d3.geoInterpolate(sourceCoord, targetCoord);
        const arcPoints = d3.range(0, 1.01, 0.02).map(t => interp(t));
        const lineGen = d3.geoPath().projection(projection);
        const geojson = { type: 'LineString', coordinates: arcPoints };

        const travelArc = arcsGroup.append('path')
            .attr('d', lineGen(geojson))
            .attr('stroke', '#e74c3c')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.9)
            .attr('fill', 'none');

        const totalLength = travelArc.node().getTotalLength();
        const travelDuration = 1000;

        travelArc
            .attr('stroke-dasharray', totalLength)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(travelDuration)
            .ease(d3.easeCubicInOut)
            .attr('stroke-dashoffset', 0);

        // On impact: switch context
        setTimeout(() => {
            // Fade out blue arcs + red travel line
            arcsGroup.selectAll('*')
                .transition()
                .duration(400)
                .attr('stroke-opacity', 0)
                .remove();

            // Dehighlight source
            svg.selectAll('.country')
                .filter(function () {
                    return d3.select(this).attr('data-id') === fromIso3;
                })
                .classed('country-selected', false)
                .transition()
                .duration(300)
                .attr('fill', NO_DATA_COLOR);

            // Fade other countries back
            svg.selectAll('.country')
                .filter(function () {
                    const id = d3.select(this).attr('data-id');
                    return id !== fromIso3 && id !== nextIso3;
                })
                .transition()
                .duration(400)
                .attr('fill', NO_DATA_COLOR);

            // Highlight next
            svg.selectAll('.country')
                .filter(function () {
                    return d3.select(this).attr('data-id') === nextIso3;
                })
                .transition()
                .duration(300)
                .attr('fill', NO_DATA_COLOR);

            // Hide panel
            d3.select('#connection-panel')
                .transition()
                .duration(300)
                .style('opacity', 0)
                .on('end', function () {
                    d3.select(this).style('display', 'none').style('opacity', 1);
                });

            setTimeout(callback, 500);
        }, travelDuration);
    }

    function showConnectionPanel(iso3, connections) {
        // let panel = d3.select('#connection-panel');
        // const sourceName = countryLookup[iso3] ? countryLookup[iso3].name : iso3;
        //
        // panel.style('display', 'block');
        // panel.html(
        //     `<div class="panel-header">
        //         <strong>${sourceName}</strong> is most often mentioned with:
        //     </div>
        //     <div class="panel-list">
        //         ${connections.slice(0, 10).map((c, i) =>
        //             `<div class="panel-row">
        //                 <span class="panel-rank">${i + 1}.</span>
        //                 <span class="panel-name">${c.name}</span>
        //                 <span class="panel-count">${c.count.toLocaleString()}</span>
        //             </div>`
        //         ).join('')}
        //     </div>`
        // );
    }

    function clearSelection() {
        selectedCountry = null;

        svg.selectAll('.country')
            .classed('country-selected', false)
            .transition()
            .duration(300)
            .attr('fill', NO_DATA_COLOR);

        svg.select('.arcs-group').selectAll('*').remove();

        d3.select('#connection-panel').style('display', 'none');
    }

    function pickNext(current, visited) {
        const connections = coocData[current];
        if (!connections) return null;

        const unvisited = connections.filter(c => !visited.has(c.id) && coocData[c.id]);
        const candidates = unvisited.length > 0 ? unvisited.slice(0, 8) : connections.slice(0, 8);

        if (unvisited.length === 0) visited.clear();

        const total = d3.sum(candidates, d => d.count);
        let r = Math.random() * total;
        for (const c of candidates) {
            r -= c.count;
            if (r <= 0) return c.id;
        }
        return candidates[0].id;
    }

    function startAutoplay() {
        autoplayActive = true;
        const available = Object.keys(coocData || {});
        if (available.length === 0) return;

        const visited = new Set();
        let current = available[Math.floor(Math.random() * available.length)];
        visited.add(current);
        showConnections(current);

        function scheduleNext() {
            if (!autoplayActive) return;
            autoplayTimer = setTimeout(() => {
                if (!autoplayActive) return;
                const next = pickNext(current, visited);
                if (!next) return;
                visited.add(next);

                teardownTo(next, () => {
                    if (!autoplayActive) return;
                    current = next;
                    showConnections(current, true);
                    scheduleNext();
                });
            }, 4500);
        }

        scheduleNext();
    }

    function stopAutoplay() {
        autoplayActive = false;
        if (autoplayTimer) {
            clearInterval(autoplayTimer);
            autoplayTimer = null;
        }
        clearSelection();
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('cooc-svg')) {
            initMap().catch(err => {
                console.error('Failed to initialize co-occurrence map:', err);
            });
        }
    });
})();
