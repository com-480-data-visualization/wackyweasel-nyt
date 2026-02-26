// NYT US City Mentions — Bubble Map Visualization
// COM-480 - EPFL

(function () {
    const WIDTH = 960;
    const HEIGHT = 600;
    const TOPO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
    const DATA_URL = 'src/data/processed/us_city_mentions.json';

    let svg, projection, path, tooltip;

    async function initBubbleMap() {
        const [topo, cities] = await Promise.all([
            d3.json(TOPO_URL),
            d3.json(DATA_URL)
        ]);

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

        // Filter cities that project onto the map (AlbersUsa returns null for non-US coords)
        const mappedCities = cities
            .map(c => {
                const coords = projection([c.lon, c.lat]);
                return coords ? { ...c, x: coords[0], y: coords[1] } : null;
            })
            .filter(Boolean);

        // Bubble size scale (sqrt for area-proportional)
        const countExtent = d3.extent(mappedCities, d => d.count);
        const radiusScale = d3.scaleSqrt()
            .domain(countExtent)
            .range([3, 50]);

        // Color scale — darker for more mentions
        const colorScale = d3.scaleSequentialLog(d3.interpolateYlOrRd)
            .domain(countExtent);

        // Draw bubbles (sorted largest first so small ones render on top)
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
                tooltip
                    .style('opacity', 1)
                    .style('left', (event.pageX + 12) + 'px')
                    .style('top', (event.pageY - 28) + 'px')
                    .html(`<strong>${d.city}, ${d.state}</strong><br>${d.count.toLocaleString()} articles`);
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

                // Pop in bubbles
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

    // Boot when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('bubble-svg')) {
            initBubbleMap().catch(err => {
                console.error('Failed to initialize bubble map:', err);
            });
        }
    });
})();
