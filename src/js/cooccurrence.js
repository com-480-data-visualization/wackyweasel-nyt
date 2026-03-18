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
        "729": "SDN", "736": "SDN", "740": "SUR", "748": "SWZ", "752": "SWE", "756": "CHE",
        "760": "SYR", "158": "TWN", "762": "TJK", "834": "TZA", "764": "THA",
        "768": "TGO", "780": "TTO", "788": "TUN", "792": "TUR", "795": "TKM",
        "800": "UGA", "804": "UKR", "784": "ARE", "826": "GBR", "840": "USA",
        "858": "URY", "860": "UZB", "862": "VEN", "704": "VNM", "887": "YEM",
        "894": "ZMB", "716": "ZWE", "-99": "XKX"
    };

    const NO_DATA_COLOR = '#2a3555';
    const TOP_N = 10;

    let coocData = null;
    let selectedCountry = null;
    let svg, projection, path;
    let countryLookup = {};
    let centroids = {};
    let generation = 0;

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
            .attr('fill', NO_DATA_COLOR)
            .on('mouseover', function (event, d) {
                const iso3 = NUMERIC_TO_ALPHA3[d.id] || d.id;
                if (!coocData || !coocData[iso3]) return;
                if (selectedCountry === iso3) return;
                showConnections(iso3);
            })
            .on('mouseout', function () {
                clearSelection();
            });

        svg.append('path')
            .datum(topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b))
            .attr('class', 'country-border')
            .attr('d', path);

        svg.append('g').attr('class', 'arcs-group').attr('pointer-events', 'none');
    }

    function showConnections(iso3) {
        if (!coocData || !coocData[iso3]) return;

        // Bump generation to invalidate any pending timeouts from previous hovers
        const gen = ++generation;
        selectedCountry = iso3;
        const connections = coocData[iso3].slice(0, TOP_N);

        const maxCount = connections[0].count;
        const coocColorScale = d3.scaleSequentialLog(d3.interpolateYlOrRd)
            .domain([1, maxCount]);

        const arcsGroup = svg.select('.arcs-group');
        // Kill all running transitions and remove immediately
        arcsGroup.selectAll('*').interrupt().remove();

        const sourceCoord = centroids[iso3];
        if (!sourceCoord) return;

        const strokeScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range([1, 4]);

        // Reset all countries immediately (interrupt any running transitions)
        svg.selectAll('.country')
            .interrupt()
            .classed('country-selected', false)
            .attr('fill', NO_DATA_COLOR);

        // Highlight source
        svg.selectAll('.country')
            .filter(function () {
                return d3.select(this).attr('data-id') === iso3;
            })
            .classed('country-selected', true);

        // Draw arcs with staggered animation
        connections.forEach((conn, i) => {
            const targetCoord = centroids[conn.id];
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

            // Color target country on arc arrival — skip if generation changed
            setTimeout(() => {
                if (generation !== gen) return;
                svg.selectAll('.country')
                    .filter(function () {
                        return d3.select(this).attr('data-id') === conn.id;
                    })
                    .transition()
                    .duration(300)
                    .attr('fill', coocColorScale(conn.count));
            }, arcDelay + arcDuration);
        });

        // Show panel
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
        // Estimate path length
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
        const sourceName = countryLookup[iso3] ? countryLookup[iso3].name : iso3;

        panel
            .style('display', 'block')
            .style('opacity', 0)
            .html(
                `<div class="panel-header">
                    <strong>${sourceName}</strong>
                </div>
                <div class="panel-list">
                    ${connections.slice(0, TOP_N).map((c, i) => {
                        const cd = countryLookup[c.id];
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

    function clearSelection() {
        generation++;
        selectedCountry = null;

        svg.selectAll('.country')
            .interrupt()
            .classed('country-selected', false)
            .transition()
            .duration(400)
            .attr('fill', NO_DATA_COLOR);

        svg.select('.arcs-group').selectAll('*')
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

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('cooc-svg')) {
            initMap().catch(err => {
                console.error('Failed to initialize co-occurrence map:', err);
            });
        }
    });
})();
