// NYT Average Word Count by Country — Grid Cartogram
// COM-480 - EPFL

(function () {
    const GRID_URL = 'src/data/processed/world_tile_grid.json';
    const DATA_URL = 'src/data/processed/country_wordcount.json';

    const CELL_SIZE = 28;
    const CELL_PAD = 2;
    const MARGIN = { top: 10, right: 10, bottom: 40, left: 10 };

    // Grid spans cols 1-28, rows 1-23
    const GRID_COLS = 28;
    const GRID_ROWS = 23;

    const WIDTH = MARGIN.left + GRID_COLS * CELL_SIZE + MARGIN.right;
    const HEIGHT = MARGIN.top + GRID_ROWS * CELL_SIZE + MARGIN.bottom;

    let svg, tooltip;

    async function initGridCartogram() {
        const [grid, data] = await Promise.all([
            d3.json(GRID_URL),
            d3.json(DATA_URL)
        ]);

        // Build lookup: ISO3 -> word count data
        const dataMap = new Map();
        for (const c of data.countries) {
            dataMap.set(c.id, c);
        }

        // SVG setup
        svg = d3.select('#wordcount-svg')
            .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        // Tooltip
        d3.select('#wordcount-tooltip').remove();
        tooltip = d3.select('body').append('div')
            .attr('id', 'wordcount-tooltip')
            .attr('class', 'tooltip');

        // Color scale — sequential blues
        const avgValues = data.countries.map(c => c.avg_word_count);
        const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain(d3.extent(avgValues));

        const NO_DATA_COLOR = '#2a3555';

        // Draw cells
        const cellGroup = svg.append('g')
            .attr('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

        const filteredGrid = grid.filter(d => d.coordinates);

        const cells = cellGroup.selectAll('g')
            .data(filteredGrid)
            .join('g')
            .attr('transform', d => {
                const col = d.coordinates[0] - 1;
                const row = d.coordinates[1] - 1;
                return `translate(${col * CELL_SIZE + (CELL_SIZE - CELL_PAD) / 2}, ${row * CELL_SIZE + (CELL_SIZE - CELL_PAD) / 2})`;
            })
            .attr('opacity', 0);

        cells.append('rect')
            .attr('x', -(CELL_SIZE - CELL_PAD) / 2)
            .attr('y', -(CELL_SIZE - CELL_PAD) / 2)
            .attr('width', CELL_SIZE - CELL_PAD)
            .attr('height', CELL_SIZE - CELL_PAD)
            .attr('rx', 2)
            .attr('fill', d => {
                const info = dataMap.get(d['alpha-3']);
                return info ? colorScale(info.avg_word_count) : NO_DATA_COLOR;
            })
            .attr('stroke', '#1e2a45')
            .attr('stroke-width', 0.5)
            .attr('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                d3.select(this)
                    .attr('stroke', '#e0e0e0')
                    .attr('stroke-width', 1.5);

                const info = dataMap.get(d['alpha-3']);
                const html = info
                    ? `<strong>${info.name}</strong><br>` +
                      `Avg. word count: <strong>${Math.round(info.avg_word_count).toLocaleString()}</strong><br>` +
                      `${info.article_count.toLocaleString()} articles`
                    : `<strong>${d.name}</strong><br>No data`;

                tooltip
                    .style('opacity', 1)
                    .style('left', (event.pageX + 14) + 'px')
                    .style('top', (event.pageY - 30) + 'px')
                    .html(html);
            })
            .on('mousemove', function (event) {
                tooltip
                    .style('left', (event.pageX + 14) + 'px')
                    .style('top', (event.pageY - 30) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this)
                    .attr('stroke', '#1e2a45')
                    .attr('stroke-width', 0.5);
                tooltip.style('opacity', 0);
            });

        // 2-letter country code labels
        cells.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('font-size', '8px')
            .attr('font-weight', 600)
            .attr('fill', d => {
                const info = dataMap.get(d['alpha-3']);
                if (!info) return '#555';
                // White text on dark cells, lighter text on light cells
                return info.avg_word_count > d3.mean(avgValues) ? '#fff' : '#ccc';
            })
            .attr('pointer-events', 'none')
            .text(d => d['alpha-2']);

        // Color legend
        const legendWidth = 200;
        const legendHeight = 10;
        const legendX = (WIDTH - legendWidth) / 2;
        const legendY = HEIGHT - MARGIN.bottom + 12;

        const defs = svg.append('defs');
        const linearGradient = defs.append('linearGradient')
            .attr('id', 'wordcount-gradient');

        linearGradient.selectAll('stop')
            .data(d3.range(0, 1.01, 0.1))
            .join('stop')
            .attr('offset', d => `${d * 100}%`)
            .attr('stop-color', d => colorScale(
                colorScale.domain()[0] + d * (colorScale.domain()[1] - colorScale.domain()[0])
            ));

        const legendGroup = svg.append('g').attr('opacity', 0);

        legendGroup.append('rect')
            .attr('x', legendX)
            .attr('y', legendY)
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .attr('rx', 3)
            .style('fill', 'url(#wordcount-gradient)');

        const legendScale = d3.scaleLinear()
            .domain(colorScale.domain())
            .range([legendX, legendX + legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .ticks(4)
            .tickFormat(d => Math.round(d).toLocaleString());

        legendGroup.append('g')
            .attr('transform', `translate(0, ${legendY + legendHeight})`)
            .call(legendAxis)
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('text').attr('font-size', '9px').attr('fill', '#8a8fa8'));

        legendGroup.append('text')
            .attr('x', WIDTH / 2)
            .attr('y', legendY - 3)
            .attr('text-anchor', 'middle')
            .attr('font-size', '9px')
            .attr('fill', '#8a8fa8')
            .text('Avg. word count per article');

        // Animate on scroll — diagonal wave
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                observer.disconnect();

                cells.transition()
                    .delay(d => {
                        const col = d.coordinates[0] - 1;
                        const row = d.coordinates[1] - 1;
                        return (col + row) * 12;
                    })
                    .duration(400)
                    .ease(d3.easeBackOut.overshoot(1.2))
                    .attr('opacity', 1);

                const maxDelay = (GRID_COLS + GRID_ROWS) * 12;
                legendGroup.transition()
                    .delay(maxDelay)
                    .duration(400)
                    .attr('opacity', 1);
            });
        }, { threshold: 0.15 });

        observer.observe(document.getElementById('wordcount-visualization'));
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('wordcount-svg')) {
            initGridCartogram().catch(err => {
                console.error('Failed to initialize word count grid cartogram:', err);
            });
        }
    });
})();
