// NYT US City Mentions — Bubble Map Visualization
// COM-480 - EPFL

(function () {
    const WIDTH = 960;
    const HEIGHT = 600;
    const TOPO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
    const DATA_URL = 'src/data/processed/us_city_mentions.json';

    // Sparkline dimensions
    const SPARK_W = 200;
    const SPARK_H = 60;
    const SPARK_PAD = { top: 5, right: 5, bottom: 15, left: 5 };

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

        // X-axis labels (first, middle, last)
        const midIdx = Math.floor(years.length / 2);
        const labels = [
            { x: pl, label: years[0] },
            { x: pl + (midIdx / (years.length - 1)) * iw, label: years[midIdx] },
            { x: pl + iw, label: years[years.length - 1] }
        ];

        let labelsSvg = labels.map(l =>
            `<text x="${l.x.toFixed(1)}" y="${h}" text-anchor="middle" font-size="9" fill="#8a8fa8">${l.label}</text>`
        ).join('');

        return `<svg width="${w}" height="${h}" style="display:block">` +
            `<path d="${area}" fill="rgba(52,152,219,0.15)"/>` +
            `<path d="${line}" fill="none" stroke="#3498db" stroke-width="1.5"/>` +
            labelsSvg +
            `<text x="${w / 2}" y="${pt - 1}" text-anchor="middle" font-size="9" fill="#8a8fa8">% of all articles</text>` +
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
