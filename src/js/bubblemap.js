// NYT US City Mentions — Bubble Map Visualization
// COM-480 - EPFL

(function () {
    const WIDTH = 960;
    const HEIGHT = 600;
    const TOPO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
    const DATA_URL = 'src/data/processed/us_city_mentions.json';

    // Sparkline dimensions
    const SPARK_W = 260;
    const SPARK_H = 85;
    const SPARK_PAD = { top: 8, right: 10, bottom: 18, left: 32 };

    let svg, projection, path, tooltip;

    async function initBubbleMap() {
        const [topo, data] = await Promise.all([
            d3.json(TOPO_URL),
            d3.json(DATA_URL)
        ]);

        // Support both old format (array) and new format ({years, cities})
        const cities = Array.isArray(data) ? data : data.cities;
        const years = Array.isArray(data) ? null : data.years;

        // SVG setup
        svg = d3.select('#bubble-svg')
            .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        projection = d3.geoAlbersUsa()
            .scale(1200)
            .translate([WIDTH / 2, HEIGHT / 2]);

        path = d3.geoPath().projection(projection);

        // Move tooltip to body so pageX/pageY positioning works correctly
        d3.select('#bubble-tooltip').remove();
        tooltip = d3.select('body').append('div')
            .attr('id', 'bubble-tooltip')
            .attr('class', 'tooltip');

        // Draw state outlines
        const states = topojson.feature(topo, topo.objects.states).features;

        svg.append('g')
            .attr('class', 'us-states')
            .selectAll('path')
            .data(states)
            .join('path')
            .attr('d', path)
            .attr('class', 'us-state');

        // State borders
        svg.append('path')
            .datum(topojson.mesh(topo, topo.objects.states, (a, b) => a !== b))
            .attr('class', 'us-state-border')
            .attr('d', path);

        // Filter cities that project onto the map
        const mappedCities = cities
            .map(c => {
                const coords = projection([c.lon, c.lat]);
                return coords ? { ...c, x: coords[0], y: coords[1] } : null;
            })
            .filter(Boolean);

        // Bubble size scale
        const countExtent = d3.extent(mappedCities, d => d.count);
        const radiusScale = d3.scaleSqrt()
            .domain(countExtent)
            .range([3, 50]);

        // Color scale
        const colorScale = d3.scaleSequentialLog(d3.interpolateYlOrRd)
            .domain(countExtent);

        // Draw bubbles (sorted largest first)
        mappedCities.sort((a, b) => b.count - a.count);

        svg.append('g')
            .attr('class', 'city-bubbles')
            .selectAll('circle')
            .data(mappedCities)
            .join('circle')
            .attr('class', 'city-bubble')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', 0)
            .attr('fill', d => colorScale(d.count))
            .attr('stroke', '#1e2a45')
            .attr('stroke-width', 0.5)
            .attr('opacity', 0)
            .on('mouseover', function (event, d) {
                d3.select(this)
                    .attr('opacity', 1)
                    .attr('stroke-width', 2);

                let html = `<strong>${d.city}, ${d.state}</strong><br>${d.count.toLocaleString()} articles`;

                if (years && d.pct_by_year) {
                    html += `<div style="margin-top:6px">${buildSparkline(d.pct_by_year, years)}</div>`;
                }

                tooltip
                    .style('opacity', 1)
                    .style('left', (event.pageX + 12) + 'px')
                    .style('top', (event.pageY - 28) + 'px')
                    .html(html);
            })
            .on('mousemove', function (event) {
                tooltip
                    .style('left', (event.pageX + 12) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this)
                    .attr('opacity', 0.75)
                    .attr('stroke-width', 0.5);
                tooltip.style('opacity', 0);
            });

        // Animate on scroll
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                observer.disconnect();

                svg.selectAll('.city-bubble')
                    .transition()
                    .delay((d, i) => i * 12)
                    .duration(400)
                    .ease(d3.easeBackOut.overshoot(1.5))
                    .attr('r', d => radiusScale(d.count))
                    .attr('opacity', 0.75);
            });
        }, { threshold: 0.15 });

        observer.observe(document.getElementById('bubble-map-visualization'));
    }

    function buildSparkline(pctValues, years) {
        const w = SPARK_W;
        const h = SPARK_H;
        const pl = SPARK_PAD.left;
        const pr = SPARK_PAD.right;
        const pt = SPARK_PAD.top;
        const pb = SPARK_PAD.bottom;
        const iw = w - pl - pr;
        const ih = h - pt - pb;

        const maxVal = Math.max(...pctValues, 0.001);

        const points = pctValues.map((v, i) => {
            const x = pl + (i / (pctValues.length - 1)) * iw;
            const y = pt + ih - (v / maxVal) * ih;
            return [x, y];
        });

        const line = points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

        // Area fill
        const area = line +
            ` L${(pl + iw).toFixed(1)},${(pt + ih).toFixed(1)}` +
            ` L${pl.toFixed(1)},${(pt + ih).toFixed(1)} Z`;

        // Calculate total path length for animation
        let totalLen = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i][0] - points[i - 1][0];
            const dy = points[i][1] - points[i - 1][1];
            totalLen += Math.sqrt(dx * dx + dy * dy);
        }
        const len = Math.ceil(totalLen);

        // Y-axis: 2-3 tick marks
        const niceMax = maxVal;
        const yTicks = [0, niceMax / 2, niceMax];
        let yAxisSvg = '';
        yTicks.forEach(v => {
            const y = pt + ih - (v / maxVal) * ih;
            const label = v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : Math.round(v);
            // Gridline
            yAxisSvg += `<line x1="${pl}" y1="${y.toFixed(1)}" x2="${pl + iw}" y2="${y.toFixed(1)}" stroke="#2a3555" stroke-width="0.5"/>`;
            // Label
            yAxisSvg += `<text x="${pl - 4}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#6a7088">${label}%</text>`;
        });

        // X-axis: first, middle, last year
        const xTicks = [0, Math.floor((years.length - 1) / 2), years.length - 1];
        let xAxisSvg = '';
        xTicks.forEach(i => {
            const x = pl + (i / (pctValues.length - 1)) * iw;
            xAxisSvg += `<text x="${x.toFixed(1)}" y="${pt + ih + 13}" text-anchor="middle" font-size="9" fill="#6a7088">${years[i]}</text>`;
        });

        return `<svg width="${w}" height="${h}" style="display:block">` +
            `<style>` +
            `@keyframes spark-draw { from { stroke-dashoffset: ${len}; } to { stroke-dashoffset: 0; } }` +
            `@keyframes spark-fill { from { opacity: 0; } to { opacity: 1; } }` +
            `.spark-line { stroke-dasharray: ${len}; stroke-dashoffset: ${len}; animation: spark-draw 1s ease-out forwards; }` +
            `.spark-area { opacity: 0; animation: spark-fill 0.5s ease-out 0.8s forwards; }` +
            `</style>` +
            yAxisSvg +
            xAxisSvg +
            `<path class="spark-area" d="${area}" fill="rgba(52,152,219,0.2)"/>` +
            `<path class="spark-line" d="${line}" fill="none" stroke="#3498db" stroke-width="2"/>` +
            `</svg>`;
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('bubble-svg')) {
            initBubbleMap().catch(err => {
                console.error('Failed to initialize bubble map:', err);
            });
        }
    });
})();
