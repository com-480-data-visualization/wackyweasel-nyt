// NYT Front Page Coverage — Trend & Year Mode
// COM-480 - EPFL

(function () {
    const MAP_WIDTH = 960;
    const MAP_HEIGHT = 500;
    const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
    const SECTIONS_URL = 'src/data/processed/country_sections.json';
    const HEADLINES_URL = 'src/data/processed/front_page_headlines.json';
    const SECTION = 'Front Page';
    const YEARS = d3.range(2000, 2025);

    const ARROW_MIN = 14;
    const ARROW_MAX = 45;
    const COLOR_INCREASE = '#3498db';
    const COLOR_DECREASE = '#e74c3c';
    const COLOR_NODATA = '#2a3555';

    // Nearby keys for typo simulation
    const nearby = {
        a:'sq',b:'vn',c:'xv',d:'sf',e:'wr',f:'dg',g:'fh',h:'gj',i:'uo',j:'hk',
        k:'jl',l:'k',m:'n',n:'bm',o:'ip',p:'o',q:'w',r:'et',s:'ad',t:'ry',
        u:'yi',v:'cb',w:'qe',x:'zc',y:'tu',z:'x'
    };

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

    async function initMap() {
        const [topo, sections, headlines] = await Promise.all([
            d3.json(TOPO_URL),
            d3.json(SECTIONS_URL),
            d3.json(HEADLINES_URL)
        ]);

        // State
        let currentMode = 'trend';
        let currentYear = 2000;
        let isVisible = false;
        let headlineTimer = null;

        const countryLookup = {};
        sections.countries.forEach(c => { countryLookup[c.id] = c; });

        const yearToIndex = {};
        sections.years.forEach((y, i) => { yearToIndex[y] = i; });

        const topoCountries = topojson.feature(topo, topo.objects.countries).features;
        const mesh = topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b);

        const projection = d3.geoNaturalEarth1()
            .scale(155)
            .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
        const pathGen = d3.geoPath().projection(projection);

        // Compute trend data
        const trends = [];
        const centroids = {};
        topoCountries.forEach(feature => {
            const iso3 = NUMERIC_TO_ALPHA3[feature.id] || feature.id;
            const centroid = pathGen.centroid(feature);
            if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;
            centroids[iso3] = centroid;

            const c = countryLookup[iso3];
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

        const maxAbsSlope = d3.max(trends, d => d.absSlope) || 1;
        const lengthScale = d3.scaleSqrt()
            .domain([0, maxAbsSlope])
            .range([ARROW_MIN, ARROW_MAX]);

        // SVG setup
        const svg = d3.select('#map-svg')
            .attr('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        // Arrow markers
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

        // Tooltip
        d3.select('#map-tooltip').remove();
        const tooltip = d3.select('body').append('div')
            .attr('id', 'map-tooltip')
            .attr('class', 'tooltip');

        // Country paths
        svg.append('g')
            .selectAll('path')
            .data(topoCountries)
            .join('path')
            .attr('d', pathGen)
            .attr('class', 'country')
            .attr('fill', COLOR_NODATA)
            .on('mouseover', function (event, d) {
                const iso3 = NUMERIC_TO_ALPHA3[d.id] || d.id;
                d3.select(this).classed('country-hover', true);

                if (currentMode === 'trend') {
                    const t = trends.find(tr => tr.iso3 === iso3);
                    if (!t) return;
                    const dir = t.slope > 0 ? 'Increasing' : 'Decreasing';
                    const color = t.slope > 0 ? COLOR_INCREASE : COLOR_DECREASE;
                    tooltip.style('opacity', 1)
                        .html(`<strong>${t.name}</strong><br>` +
                            `Total front page mentions: ${t.total.toLocaleString()}<br>` +
                            `Trend: <span style="color:${color};font-weight:600">${dir}</span> ` +
                            `(slope: ${t.slope.toFixed(2)}/yr)`);
                } else {
                    const t = trends.find(tr => tr.iso3 === iso3);
                    if (!t) return;
                    const yi = yearToIndex[currentYear];
                    const val = yi !== undefined ? (t.values[YEARS.indexOf(currentYear)] || 0) : 0;
                    const totalYear = sections.countries.reduce((sum, c) => {
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

                    // Start cycling headlines
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
            })
            .on('mousemove', function (event) {
                tooltip.style('left', (event.pageX + 12) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this).classed('country-hover', false);
                tooltip.style('opacity', 0);
                if (headlineTimer) { clearTimeout(headlineTimer); headlineTimer = null; }
            });

        // Typewriter for headlines with typo simulation
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

        // Borders
        svg.append('path')
            .datum(mesh)
            .attr('class', 'country-border')
            .attr('d', pathGen);

        // Arrow group
        const arrowGroup = svg.append('g').attr('class', 'trend-arrows');

        // Legend
        const legend = svg.append('g')
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

        // --- Drawing functions ---

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

            legend.transition().duration(400)
                .attr('opacity', animate ? 1 : 1);
        }

        function drawYearArrows(year, animate) {
            const yi = YEARS.indexOf(year);
            if (yi < 0) return;

            // Compute front-page % per country for this year
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

        function drawCurrentMode(animate) {
            if (currentMode === 'trend') {
                drawTrendArrows(animate);
            } else {
                drawYearArrows(currentYear, animate);
            }
        }

        function collapseArrows() {
            arrowGroup.selectAll('line')
                .transition().duration(300)
                .attr('x1', function () {
                    const d = d3.select(this).datum();
                    return d ? d.centroid[0] : 0;
                })
                .attr('y1', function () {
                    const d = d3.select(this).datum();
                    return d ? d.centroid[1] : 0;
                })
                .attr('x2', function () {
                    const d = d3.select(this).datum();
                    return d ? d.centroid[0] : 0;
                })
                .attr('y2', function () {
                    const d = d3.select(this).datum();
                    return d ? d.centroid[1] : 0;
                })
                .attr('opacity', 0);
            legend.transition().duration(300).attr('opacity', 0);
        }

        // --- Controls ---

        const modeButtons = document.querySelectorAll('.map-mode-btn');
        const yearControls = document.getElementById('map-year-controls');
        const yearSlider = document.getElementById('map-year-slider');
        const yearLabel = document.getElementById('map-year-label');

        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode === currentMode) return;
                currentMode = mode;
                modeButtons.forEach(b => b.classList.toggle('active', b === btn));
                yearControls.style.display = mode === 'year' ? 'flex' : 'none';
                if (headlineTimer) { clearTimeout(headlineTimer); headlineTimer = null; }
                tooltip.style('opacity', 0);
                drawCurrentMode(true);
            });
        });

        if (yearSlider) {
            yearSlider.addEventListener('input', () => {
                currentYear = +yearSlider.value;
                yearLabel.textContent = currentYear;
                if (headlineTimer) { clearTimeout(headlineTimer); headlineTimer = null; }
                tooltip.style('opacity', 0);
                drawYearArrows(currentYear, false);
            });
        }

        // --- IntersectionObserver (re-triggers on each scroll) ---

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    isVisible = true;
                    drawCurrentMode(true);
                } else {
                    isVisible = false;
                    collapseArrows();
                    if (headlineTimer) { clearTimeout(headlineTimer); headlineTimer = null; }
                }
            });
        }, { threshold: 0.15 });

        observer.observe(document.getElementById('map-visualization'));
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('map-svg')) {
            initMap().catch(err => {
                console.error('Failed to initialize trend map:', err);
            });
        }
    });
})();
