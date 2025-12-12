// Global Terrorism Data Visualization
// Interactive multi-view analysis system

let globalData = [];
let filteredData = [];
let currentYear = 2020;
let startYear = 1970;
let endYear = 2020;
let animationInterval = null;
let isPlaying = false;

// Pie chart state for hierarchical visualization
let pieChartState = {
    currentView: 'continent', // 'continent', 'country', 'attack-type'
    selectedContinent: null,
    selectedCountry: null
};

// Academic color palette based on ColorBrewer
const attackColors = {
    'Assassination': '#e41a1c',
    'Armed Assault': '#ff7f00',
    'Bombing/Explosion': '#a65628',
    'Hostage Taking (Kidnapping)': '#984ea3',
    'Facility/Infrastructure Attack': '#377eb8',
    'Hijacking': '#4daf4a',
    'Unarmed Assault': '#f781bf',
    'Unknown': '#999999'
};

// Region to Continent mapping
const regionToContinentMap = {
    'North America': 'North America',
    'Central America & Caribbean': 'North America',
    'South America': 'South America',
    'Western Europe': 'Europe',
    'Eastern Europe': 'Europe',
    'Middle East & North Africa': 'Africa',
    'Sub-Saharan Africa': 'Africa',
    'South Asia': 'Asia',
    'Southeast Asia': 'Asia',
    'East Asia': 'Asia',
    'Central Asia': 'Asia',
    'Australasia & Oceania': 'Oceania',
    'Russia & Newly Independent States (NIS)': 'Europe'
};

// Academic color palette for continents
const continentColors = {
    'North America': '#1f78b4',
    'South America': '#33a02c',
    'Europe': '#6a3d9a',
    'Africa': '#ff7f00',
    'Asia': '#e31a1c',
    'Oceania': '#b2df8a'
};

const countryColorScale = d3.scaleSequential(d3.interpolateSpectral);

const attackTypeGradients = {
    'Assassination': ['#cb181d', '#e41a1c'],
    'Armed Assault': ['#d94801', '#ff7f00'],
    'Bombing/Explosion': ['#8c510a', '#a65628'],
    'Hostage Taking (Kidnapping)': '#984ea3',
    'Facility/Infrastructure Attack': ['#08519c', '#377eb8'],
    'Hijacking': ['#238b45', '#4daf4a'],
    'Unarmed Assault': ['#dd1c77', '#f781bf'],
    'Unknown': ['#737373', '#999999']
};

// Main initialization function
async function init() {
    try {
        console.log('Starting initialization...');
        showLoading(true);

        await loadData();
        console.log('Data loaded successfully');

        initAll();
        console.log('Visualizations initialized');

        setupControls();
        console.log('Controls set up');

        updateAll();
        console.log('Initial update complete');

        showLoading(false);
    } catch (error) {
        console.error('Initialization error:', error);
        showLoading(false);
        alert('Error loading visualization: ' + error.message + '\nCheck console for details.');
    }
}

// Load and process data
async function loadData() {
    try {
        console.log('Loading CSV data...');
        const data = await d3.csv('data/dataset.csv');
        console.log('CSV loaded, processing ' + data.length + ' rows...');

        if (!data || data.length === 0) {
            throw new Error('No data loaded from CSV file');
        }

        globalData = data.map(d => ({
            year: +d.iyear || 0,
            region: d.region_txt || 'Unknown',
            city: d.city || 'Unknown',
            latitude: parseFloat(d.latitude) || 0,
            longitude: parseFloat(d.longitude) || 0,
            attackType: d.attacktype1_txt || 'Unknown',
            targetType: d.targtype1_txt || 'Unknown',
            weaponType: d.weaptype1_txt || 'Unknown',
            groupName: d.gname || 'Unknown',
            killed: +d.nkill || 0,
            wounded: +d.nwound || 0,
            country: d.country_txt || 'Unknown'
        })).filter(d => d.latitude !== 0 && d.longitude !== 0 && d.year >= 1970 && d.year <= 2020);

        console.log('Filtered to ' + globalData.length + ' valid incidents');

        if (globalData.length === 0) {
            throw new Error('No valid data after filtering');
        }

        filteredData = globalData;
        populateFilters();
        console.log('Loaded ' + globalData.length + ' incidents');
    } catch (error) {
        console.error('Data loading error:', error);
        throw new Error('Failed to load data: ' + error.message);
    }
}

// Populate filter dropdowns
function populateFilters() {
    const regions = [...new Set(globalData.map(d => d.region))].sort();
    const regionSelect = d3.select('#regionFilter');

    regionSelect.selectAll('option:not([value="all"])')
        .data(regions)
        .enter()
        .append('option')
        .attr('value', d => d)
        .text(d => d);

    // Get countries, filter out null/empty, and handle 'Unknown'
    const countries = [...new Set(globalData.map(d => d.country || 'Unknown'))]
        .filter(c => c && c.trim() !== '')
        .sort();
    const countrySelect = d3.select('#countryFilter');

    countrySelect.selectAll('option:not([value="all"])')
        .data(countries)
        .enter()
        .append('option')
        .attr('value', d => d)
        .text(d => d);

    const attackTypes = [...new Set(globalData.map(d => d.attackType))].sort();
    const attackSelect = d3.select('#attackTypeFilter');

    attackSelect.selectAll('option:not([value="all"])')
        .data(attackTypes)
        .enter()
        .append('option')
        .attr('value', d => d)
        .text(d => d);
}

// Initialize all visualizations
function initAll() {
    try {
        console.log('Initializing map...');
        initMap();
        console.log('Map initialized');
    } catch (e) {
        console.error('Map initialization failed:', e);
        throw new Error('Map init failed: ' + e.message);
    }

    try {
        console.log('Initializing sankey...');
        initSankey();
        console.log('Sankey initialized');
    } catch (e) {
        console.error('Sankey initialization failed:', e);
        throw new Error('Sankey init failed: ' + e.message);
    }

    try {
        console.log('Initializing heatmap...');
        initHeatmap();
        console.log('Heatmap initialized');
    } catch (e) {
        console.error('Heatmap initialization failed:', e);
        throw new Error('Heatmap init failed: ' + e.message);
    }

    try {
        console.log('Initializing attack chart...');
        initAttackChart();
        console.log('Attack chart initialized');
    } catch (e) {
        console.error('Attack chart initialization failed:', e);
        throw new Error('Attack chart init failed: ' + e.message);
    }
}

// ==== GEOGRAPHIC MAP ====
function initMap() {
    const container = d3.select('#map-container');
    const bbox = container.node().getBoundingClientRect();
    const width = bbox.width;
    const height = bbox.height;

    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('id', 'geo-svg')
        .style('display', 'block');

    // Fetch World TopoJSON for background
    d3.json('https://unpkg.com/world-atlas@2.0.2/countries-110m.json').then(worldData => {
        const countries = topojson.feature(worldData, worldData.objects.countries);

        // Define Projection
        const scale = Math.min(width / 6.28, height / 2.5);
        const projection = d3.geoMercator()
            .scale(scale)
            .center([0, 20])
            .translate([width / 2, height / 2]);

        const path = d3.geoPath().projection(projection);

        // Store globally for updateMap usage
        window.currentProjection = projection;
        window.currentGeoPath = path;
        window.mapWidth = width;
        window.mapHeight = height;

        // Create main group for zooming
        const g = svg.append('g').attr('class', 'map-group');

        // Draw World Background
        const worldLayer = g.append('g').attr('class', 'world-map-layer');
        worldLayer.selectAll('path')
            .data(countries.features)
            .enter().append('path')
            .attr('d', path)
            .attr('fill', '#1E293B')
            .attr('fill-opacity', 0.5)
            .attr('stroke', '#334155')
            .attr('stroke-width', 0.5)
            .style('transition', 'all 0.3s ease');

        // Create layer for data points
        g.append('g').attr('class', 'points-layer');

        // Setup optimized zoom behavior with throttling
        let zoomFrame = null;
        const zoom = d3.zoom()
            .scaleExtent([1, 12])
            .on('zoom', (event) => {
                const transform = event.transform;
                g.attr('transform', transform);

                // Store current zoom level
                window.currentZoomTransform = transform;

                // Throttle expensive updates using requestAnimationFrame
                if (zoomFrame) cancelAnimationFrame(zoomFrame);
                zoomFrame = requestAnimationFrame(() => {
                    // Update stroke widths for better appearance at different zoom levels
                    worldLayer.selectAll('path')
                        .attr('stroke-width', 0.5 / transform.k);

                    // Update point sizes dynamically
                    updatePointSizes(transform.k);
                });
            });

        svg.call(zoom);

        // Store zoom behavior globally
        window.mapZoom = zoom;
        window.mapSvg = svg;
        window.mapGroup = g;

        // Double-click to reset zoom
        svg.on('dblclick.zoom', function () {
            svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
        });

        // Initial Update
        window.currentZoomTransform = d3.zoomIdentity;
        updateMap();
    }).catch(err => {
        console.error('Failed to load world map:', err);
    });

    createLegend();
}

// Function to zoom to a specific location
function zoomToLocation(longitude, latitude, zoomLevel = 6) {
    const svg = window.mapSvg;
    const projection = window.currentProjection;
    const zoom = window.mapZoom;

    if (!svg || !projection || !zoom) return;

    const coords = projection([longitude, latitude]);
    const width = window.mapWidth;
    const height = window.mapHeight;

    // Calculate transform to center on the location
    const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(zoomLevel)
        .translate(-coords[0], -coords[1]);

    svg.transition()
        .duration(750)
        .call(zoom.transform, transform);
}

// Update point sizes based on zoom level (optimized)
function updatePointSizes(zoomLevel) {
    const gPoints = d3.select('.points-layer');
    const strokeWidth = 0.5 / zoomLevel;
    const sqrtZoom = Math.sqrt(zoomLevel);

    gPoints.selectAll('circle').each(function () {
        const elem = d3.select(this);
        const baseRadius = parseFloat(elem.attr('data-base-radius') || 5);
        const scaledRadius = baseRadius / sqrtZoom;
        elem.attr('r', Math.max(1.5, scaledRadius))
            .attr('stroke-width', strokeWidth);
    });
}

function updateMap() {
    const svg = d3.select('#geo-svg');
    const gPoints = svg.select('.points-layer');
    const projection = window.currentProjection;

    if (!projection) {
        console.warn('Projection not ready');
        return;
    }

    const yearData = filteredData.filter(d => d.year <= currentYear);

    // Aggregate by location (optimized)
    const locationData = d3.rollup(
        yearData,
        v => ({
            count: v.length,
            killed: d3.sum(v, d => d.killed),
            wounded: d3.sum(v, d => d.wounded),
            attackType: v[0].attackType,
            city: v[0].city,
            country: v[0].country
        }),
        d => d.latitude.toFixed(2) + ',' + d.longitude.toFixed(2)
    );

    const points = Array.from(locationData, ([key, value]) => {
        const coords = key.split(',');
        return {
            ...value,
            latitude: parseFloat(coords[0]),
            longitude: parseFloat(coords[1])
        };
    });

    // Radius scale
    const radiusScale = d3.scaleSqrt()
        .domain([0, d3.max(points, d => d.killed + d.wounded + 1) || 10])
        .range([2, 10]);

    // Get current zoom level
    const currentZoom = window.currentZoomTransform ? window.currentZoomTransform.k : 1;

    // Fast update without transitions during animation
    const isAnimating = isPlaying;

    const circles = gPoints.selectAll('circle')
        .data(points, d => `${d.latitude}-${d.longitude}`);

    // Exit
    circles.exit().remove();

    // Enter
    const enter = circles.enter()
        .append('circle')
        .attr('cx', d => projection([d.longitude, d.latitude])[0])
        .attr('cy', d => projection([d.longitude, d.latitude])[1])
        .attr('data-base-radius', d => radiusScale(d.killed + d.wounded + 1))
        .attr('fill', d => attackColors[d.attackType] || '#64748B')
        .attr('fill-opacity', 0.7)
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5 / currentZoom)
        .style('cursor', 'pointer')
        .attr('r', 0);

    if (!isAnimating) {
        enter.transition().duration(300).attr('r', d => radiusScale(d.killed + d.wounded + 1) / Math.sqrt(currentZoom));
    } else {
        enter.attr('r', d => radiusScale(d.killed + d.wounded + 1) / Math.sqrt(currentZoom));
    }

    // Update (merge enter + existing)
    const merged = enter.merge(circles);

    if (!isAnimating) {
        merged
            .transition()
            .duration(200)
            .attr('r', d => radiusScale(d.killed + d.wounded + 1) / Math.sqrt(currentZoom));
    } else {
        // No transition during animation for speed
        merged.attr('r', d => radiusScale(d.killed + d.wounded + 1) / Math.sqrt(currentZoom));
    }

    // Set up interactions only once
    merged
        .on('mouseover.tip', function (event, d) {
            const baseRadius = parseFloat(d3.select(this).attr('data-base-radius'));
            d3.select(this)
                .attr('fill-opacity', 1)
                .attr('stroke-width', 2 / currentZoom)
                .attr('stroke', '#ff7f00')
                .attr('r', (baseRadius / Math.sqrt(currentZoom)) * 1.5);
            showTip(event, d);
        })
        .on('mouseout.tip', function (event, d) {
            const baseRadius = parseFloat(d3.select(this).attr('data-base-radius'));
            d3.select(this)
                .attr('fill-opacity', 0.7)
                .attr('stroke-width', 0.5 / currentZoom)
                .attr('stroke', '#fff')
                .attr('r', baseRadius / Math.sqrt(currentZoom));
            hideTip();
        })
        .on('click.zoom', function (event, d) {
            event.stopPropagation();
            zoomToLocation(d.longitude, d.latitude, 6);
        });
}

function createLegend() {
    const legend = d3.select('#map-legend');
    legend.html('');

    // Add legend title and controls
    const header = legend.append('div')
        .style('display', 'flex')
        .style('justify-content', 'space-between')
        .style('align-items', 'center')
        .style('margin-bottom', '12px');

    header.append('h3')
        .style('margin', '0')
        .text('Attack Types');

    // Add reset zoom button
    header.append('button')
        .attr('class', 'btn-secondary')
        .style('padding', '4px 12px')
        .style('font-size', '11px')
        .text('Reset Zoom')
        .on('click', function () {
            const svg = window.mapSvg;
            const zoom = window.mapZoom;
            if (svg && zoom) {
                svg.transition()
                    .duration(750)
                    .call(zoom.transform, d3.zoomIdentity);
            }
        });

    Object.entries(attackColors).forEach(([type, color]) => {
        legend.append('div')
            .attr('class', 'legend-item')
            .html('<div class="legend-color" style="background:' + color + ';"></div><span>' + type + '</span>');
    });
}

// ==== SANKEY DIAGRAM ====
function initSankey() {
    updateSankey();
}

function updateSankey() {
    const container = d3.select('#sankey-container');
    const width = container.node().getBoundingClientRect().width;
    const height = container.node().getBoundingClientRect().height;

    container.selectAll('*').remove();

    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const data = createSankeyData();

    const sankey = d3.sankey()
        .nodeWidth(15)
        .nodePadding(10)
        .size([width - margin.left - margin.right, height - margin.top - margin.bottom]);

    const graph = sankey(data);

    const colorScale = d3.scaleOrdinal()
        .domain(['attack', 'target', 'weapon'])
        .range(['#e41a1c', '#984ea3', '#377eb8']);

    const g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // Links
    g.append('g')
        .selectAll('path')
        .data(graph.links)
        .join('path')
        .attr('class', 'sankey-link')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('stroke', d => colorScale(d.source.category))
        .attr('stroke-width', d => Math.max(1, d.width));

    // Nodes
    const node = g.append('g')
        .selectAll('g')
        .data(graph.nodes)
        .join('g')
        .attr('class', 'sankey-node');

    node.append('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('height', d => d.y1 - d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('fill', d => colorScale(d.category))
        .attr('opacity', 0.8);

    node.append('text')
        .attr('x', d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr('y', d => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
        .text(d => d.name)
        .style('font-size', '10px')
        .style('fill', '#F1F5F9');
}

function createSankeyData() {
    const nodes = [];
    const links = [];
    const nodeMap = {};

    const attackTypes = getTop(filteredData, 'attackType', 5);
    const targetTypes = getTop(filteredData, 'targetType', 5);
    const weaponTypes = getTop(filteredData, 'weaponType', 5);

    let nodeId = 0;

    attackTypes.forEach(name => {
        nodes.push({ name: name, category: 'attack', id: nodeId });
        nodeMap['attack-' + name] = nodeId++;
    });

    targetTypes.forEach(name => {
        nodes.push({ name: name, category: 'target', id: nodeId });
        nodeMap['target-' + name] = nodeId++;
    });

    weaponTypes.forEach(name => {
        nodes.push({ name: name, category: 'weapon', id: nodeId });
        nodeMap['weapon-' + name] = nodeId++;
    });

    const attackToTarget = {};
    const targetToWeapon = {};

    filteredData.forEach(d => {
        if (attackTypes.includes(d.attackType) && targetTypes.includes(d.targetType)) {
            const key = d.attackType + '->' + d.targetType;
            attackToTarget[key] = (attackToTarget[key] || 0) + 1;
        }

        if (targetTypes.includes(d.targetType) && weaponTypes.includes(d.weaponType)) {
            const key = d.targetType + '->' + d.weaponType;
            targetToWeapon[key] = (targetToWeapon[key] || 0) + 1;
        }
    });

    Object.entries(attackToTarget).forEach(([key, value]) => {
        const parts = key.split('->');
        links.push({
            source: nodeMap['attack-' + parts[0]],
            target: nodeMap['target-' + parts[1]],
            value: value
        });
    });

    Object.entries(targetToWeapon).forEach(([key, value]) => {
        const parts = key.split('->');
        links.push({
            source: nodeMap['target-' + parts[0]],
            target: nodeMap['weapon-' + parts[1]],
            value: value
        });
    });

    return { nodes, links };
}

// ==== HEATMAP (STANDARD) ====
function initHeatmap() {
    updateHeatmap();
}

function updateHeatmap() {
    const container = d3.select('#heatmap-container');
    const containerWidth = container.node().getBoundingClientRect().width;
    const containerHeight = container.node().getBoundingClientRect().height;

    container.selectAll('*').remove();

    const margin = { top: 30, right: 120, bottom: 80, left: 120 };

    // Calculate required dimensions based on data
    const regions = [...new Set(filteredData.map(d => d.region))].sort();
    const years = d3.range(1970, 2021, 1);

    // Make SVG larger to enable scrolling if needed, but fitting first
    const width = Math.max(containerWidth, margin.left + margin.right);
    const height = Math.max(containerHeight, margin.top + margin.bottom);

    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);

    const metric = document.querySelector('input[name="metric"]:checked').value;

    const matrixData = [];
    years.forEach(year => {
        regions.forEach(region => {
            const incidents = filteredData.filter(d => d.year === year && d.region === region);
            let value;
            if (metric === 'count') {
                value = incidents.length;
            } else if (metric === 'casualties') {
                value = d3.sum(incidents, d => d.killed + d.wounded);
            } else {
                value = incidents.length > 0 ? d3.sum(incidents, d => d.killed) / incidents.length : 0;
            }
            matrixData.push({ year, region, value });
        });
    });

    const maxValue = d3.max(matrixData, d => d.value);

    const x = d3.scaleBand()
        .domain(years)
        .range([margin.left, width - margin.right])
        .padding(0.05);

    const y = d3.scaleBand()
        .domain(regions)
        .range([margin.top, height - margin.bottom])
        .padding(0.05);

    const colorScale = d3.scaleSequential()
        .domain([0, maxValue])
        .interpolator(d3.interpolateInferno);

    svg.append('g')
        .selectAll('rect')
        .data(matrixData)
        .join('rect')
        .attr('class', 'heatmap-cell')
        .attr('x', d => x(d.year))
        .attr('y', d => y(d.region))
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('fill', d => d.value > 0 ? colorScale(d.value) : '#1F2937')
        .attr('opacity', 0.9)
        .on('mouseover', function (event, d) {
            d3.select(this)
                .attr('opacity', 1)
                .attr('stroke', '#ff7f00')
                .attr('stroke-width', 2);

            // Determine metric label
            const metricLabel = metric === 'count' ? 'Incidents' :
                              metric === 'casualties' ? 'Casualties' :
                              'Lethality Index';

            const content = `
                <strong style="font-size: 14px;">${d.region}</strong><br/>
                <span style="color: #ff7f00;">Year: ${d.year}</span><br/><br/>
                <span style="color: #377eb8;">${metricLabel}: ${d.value.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            `;
            showTip(event, d, content);
        })
        .on('mouseout', function (event, d) {
            d3.select(this)
                .attr('opacity', 0.9)
                .attr('stroke', 'none');
            hideTip();
        })
        .on('click', function (event, d) {
            currentYear = d.year;
            document.getElementById('currentYear').textContent = currentYear;
            updateMap();
        });

    svg.append('g')
        .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
        .call(d3.axisBottom(x).tickValues(years.filter((d, i) => i % 2 === 0)))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '10px')
        .style('fill', '#F1F5F9');

    svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',0)')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#F1F5F9');

    // Add color legend
    const legendWidth = 20;
    const legendHeight = height - margin.top - margin.bottom;
    const legendX = width - margin.right + 20;
    const legendY = margin.top;

    // Create legend gradient with defs
    const defs = svg.append('defs');
    const linearGradient = defs.append('linearGradient')
        .attr('id', 'heatmap-gradient-' + metric)
        .attr('x1', '0%')
        .attr('y1', '100%')
        .attr('x2', '0%')
        .attr('y2', '0%');

    // Add more gradient stops for smooth transition matching the exact colorScale
    const numStops = 20;
    for (let i = 0; i <= numStops; i++) {
        const t = i / numStops;
        const value = t * maxValue;
        linearGradient.append('stop')
            .attr('offset', (i * 100 / numStops) + '%')
            .attr('stop-color', colorScale(value));
    }

    // Draw legend rectangle
    svg.append('rect')
        .attr('x', legendX)
        .attr('y', legendY)
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#heatmap-gradient-' + metric + ')')
        .attr('stroke', '#60A5FA')
        .attr('stroke-width', 1);

    // Add legend axis
    const legendScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([legendY + legendHeight, legendY]);

    const legendAxis = d3.axisRight(legendScale)
        .ticks(5)
        .tickFormat(d3.format('.0f'));

    svg.append('g')
        .attr('transform', 'translate(' + (legendX + legendWidth) + ',0)')
        .call(legendAxis)
        .selectAll('text')
        .style('fill', '#F1F5F9')
        .style('font-size', '10px');

    // Add axis styling
    svg.select('g').selectAll('line, path')
        .style('stroke', '#60A5FA')
        .style('stroke-width', 1);

    // Add legend title
    svg.append('text')
        .attr('x', legendX + legendWidth / 2)
        .attr('y', legendY - 10)
        .attr('text-anchor', 'middle')
        .style('fill', '#60A5FA')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .text(metric === 'count' ? 'Count' : metric === 'casualties' ? 'Casualties' : 'Lethality');
}

// ==== DATA AGGREGATION FUNCTIONS FOR PIE CHART ====
function aggregateDataByContinent(data) {
    const continentData = new Map();

    data.forEach(d => {
        const continent = regionToContinentMap[d.region] || 'Unknown';
        if (!continentData.has(continent)) {
            continentData.set(continent, {
                continent: continent,
                count: 0,
                killed: 0,
                wounded: 0
            });
        }
        const agg = continentData.get(continent);
        agg.count++;
        agg.killed += d.killed;
        agg.wounded += d.wounded;
    });

    return Array.from(continentData.values());
}

function aggregateDataByCountry(data, continent) {
    const countryData = new Map();

    const filtered = data.filter(d => regionToContinentMap[d.region] === continent);

    filtered.forEach(d => {
        if (!countryData.has(d.country)) {
            countryData.set(d.country, {
                country: d.country,
                continent: continent,
                count: 0,
                killed: 0,
                wounded: 0
            });
        }
        const agg = countryData.get(d.country);
        agg.count++;
        agg.killed += d.killed;
        agg.wounded += d.wounded;
    });

    return Array.from(countryData.values()).sort((a, b) => b.count - a.count).slice(0, 10); // Top 10
}

function aggregateDataByAttackType(data, country) {
    const attackData = new Map();

    const filtered = data.filter(d => d.country === country);

    filtered.forEach(d => {
        const key = d.attackType;
        if (!attackData.has(key)) {
            attackData.set(key, {
                attackType: key,
                country: country,
                count: 0,
                killed: 0,
                wounded: 0
            });
        }
        const agg = attackData.get(key);
        agg.count++;
        agg.killed += d.killed;
        agg.wounded += d.wounded;
    });

    return Array.from(attackData.values());
}

// ==== DYNAMIC HIERARCHICAL PIE CHART WITH HOVER ZOOM ====
function initAttackChart() {
    updateAttackChart();
}

function updateAttackChart() {
    const container = d3.select('#attack-chart-container');
    container.selectAll('*').remove();

    const bbox = container.node().getBoundingClientRect();
    const width = bbox.width;
    const height = bbox.height;
    const centerX = width / 2;
    const centerY = height / 2;
    // Calculate radius to fit all layers (base + country + attack type layers)
    // Attack type layer goes to radius * 1.5, plus labels at 1.7
    // Increased radius for better spacing and visibility
    const radius = Math.min(width, height) / 2 / 2.0;

    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);

    const g = svg.append('g')
        .attr('transform', `translate(${centerX},${centerY})`);

    // Get all continents data
    const continentData = aggregateDataByContinent(filteredData);

    // Create pie layout
    const pie = d3.pie()
        .value(d => d.count)
        .sort(null)
        .padAngle(0.02);

    const baseArc = d3.arc()
        .innerRadius(radius * 0.5)
        .outerRadius(radius * 0.85);

    // Create continent slices
    const continentArcs = g.selectAll('.continent-arc')
        .data(pie(continentData))
        .enter().append('g')
        .attr('class', 'continent-arc');

    // Create gradient definitions
    const defs = svg.append('defs');
    continentData.forEach((d, i) => {
        const gradient = defs.append('radialGradient')
            .attr('id', `continent-gradient-${i}`)
            .attr('cx', '50%')
            .attr('cy', '50%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', d3.color(continentColors[d.continent]).brighter(0.3));

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', continentColors[d.continent]);
    });

    // Draw continent paths
    continentArcs.append('path')
        .attr('d', baseArc)
        .attr('fill', (d, i) => `url(#continent-gradient-${i})`)
        .attr('opacity', 0.9)
        .attr('stroke', '#0B1120')
        .attr('stroke-width', 3)
        .style('cursor', 'pointer')
        .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))')
        .each(function (d) { this._current = d; });

    // Add continent labels with smart positioning
    continentArcs.append('text')
        .attr('transform', d => {
            const angle = d.endAngle - d.startAngle;
            // For small slices, position label outside
            if (angle < 0.25) {
                const outerArc = d3.arc()
                    .innerRadius(radius * 0.95)
                    .outerRadius(radius * 0.95);
                const pos = outerArc.centroid(d);
                const midAngle = d.startAngle + angle / 2;
                // Push label further out for very small slices
                pos[0] = pos[0] * 1.15;
                pos[1] = pos[1] * 1.15;
                return `translate(${pos})`;
            }
            return `translate(${baseArc.centroid(d)})`;
        })
        .attr('text-anchor', d => {
            const angle = d.endAngle - d.startAngle;
            if (angle < 0.25) {
                const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
                return midAngle < Math.PI ? 'start' : 'end';
            }
            return 'middle';
        })
        .attr('dy', d => {
            const angle = d.endAngle - d.startAngle;
            // Adjust vertical positioning for small slices
            if (angle < 0.25) {
                return '0.35em';
            }
            return '0.35em';
        })
        .style('fill', '#F1F5F9')
        .style('font-size', d => {
            const angle = d.endAngle - d.startAngle;
            return angle < 0.15 ? '9px' : '12px'; // Adjusted for smaller slices
        })
        .style('font-weight', '700')
        .style('pointer-events', 'none')
        .style('text-shadow', '0 2px 4px rgba(0, 0, 0, 0.8)')
        .text(d => {
            const angle = d.endAngle - d.startAngle;
            // For very small slices, show abbreviated name
            if (angle < 0.15) {
                return d.data.continent.substring(0, 4);
            }
            return d.data.continent.split(' ')[0];
        });

    // Center statistics
    const centerGroup = g.append('g').attr('class', 'center-stats');

    const totalIncidents = d3.sum(continentData, d => d.count);
    const totalDeaths = d3.sum(continentData, d => d.killed);

    centerGroup.append('circle')
        .attr('r', radius * 0.45)
        .attr('fill', 'rgba(26, 26, 26, 0.95)')
        .attr('stroke', '#377eb8')
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))')
        .style('pointer-events', 'none'); // Allow hover events to pass through

    const centerValue = centerGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-2.2em')
        .style('fill', '#ff7f00')
        .style('font-size', '24px')
        .style('font-weight', '800')
        .style('pointer-events', 'none')
        .text(totalIncidents.toLocaleString());

    const centerLabel = centerGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.8em')
        .style('fill', '#F1F5F9')
        .style('font-size', '10px')
        .style('font-weight', '500')
        .style('pointer-events', 'none')
        .text('Total Incidents');

    const deathValue = centerGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.5em')
        .style('fill', '#e41a1c')
        .style('font-size', '20px')
        .style('font-weight', '700')
        .style('pointer-events', 'none')
        .text(totalDeaths.toLocaleString());

    const deathLabel = centerGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '2.5em')
        .style('fill', '#CBD5E1')
        .style('font-size', '10px')
        .style('font-weight', '500')
        .style('pointer-events', 'none')
        .text('Deaths');

    // Center Text (Dynamic) - removed to prevent overlap, info is in header

    // Hover interactions for focused exploration
    let currentHoverTimeout = null;

    continentArcs
        .on('mouseenter', function (event, d) {
            const continent = d.data.continent;

            // Clear any pending timeout
            if (currentHoverTimeout) {
                clearTimeout(currentHoverTimeout);
                currentHoverTimeout = null;
            }

            // Hide other continents completely
            continentArcs.selectAll('path')
                .transition()
                .duration(300)
                .attr('opacity', cd => cd.data.continent === continent ? 1 : 0.08);

            continentArcs.selectAll('text')
                .transition()
                .duration(300)
                .style('opacity', cd => cd.data.continent === continent ? 1 : 0.2);

            // Show countries for this continent with better positioning
            showCountriesFocused(g, continent, radius, centerValue, centerLabel, deathValue, deathLabel, d);

            // Show tooltip
            const content = `
                <strong style="font-size: 14px;">${continent}</strong><br/>
                <span style="color: #ff7f00;">Incidents: ${d.data.count.toLocaleString()}</span><br/>
                <span style="color: #e41a1c;">Deaths: ${d.data.killed.toLocaleString()}</span><br/>
                <span style="color: #4daf4a;">Wounded: ${d.data.wounded.toLocaleString()}</span>
            `;
            showTip(event, d.data, content);
        })
        .on('mouseleave', function (event, d) {
            // Add generous delay to allow moving to country/attack layers
            currentHoverTimeout = setTimeout(() => {
                const relatedTarget = event.relatedTarget;
                const countryLayer = g.select('.country-layer').node();
                const attackLayer = g.select('.attack-layer').node();

                if (!countryLayer ||
                    (!relatedTarget ||
                        (!countryLayer.contains(relatedTarget) &&
                            !(attackLayer && attackLayer.contains(relatedTarget))))) {
                    // Restore all continents
                    continentArcs.selectAll('path')
                        .transition()
                        .duration(400)
                        .attr('opacity', 0.9);

                    continentArcs.selectAll('text')
                        .transition()
                        .duration(400)
                        .style('opacity', 1);

                    // Remove layers
                    g.selectAll('.country-layer, .attack-layer')
                        .transition()
                        .duration(300)
                        .style('opacity', 0)
                        .remove();

                    // Restore center stats
                    centerValue.text(totalIncidents.toLocaleString());
                    centerLabel.text('Total Incidents');
                    deathValue.text(totalDeaths.toLocaleString());
                    deathLabel.text('Deaths');

                    hideTip();
                }
            }, 400); // Generous delay for easier navigation
        });
}

// New focused interaction function
function showCountriesFocused(g, continent, baseRadius, centerValue, centerLabel, deathValue, deathLabel, continentArcData) {
    // Remove existing country/attack layers
    g.selectAll('.country-layer, .attack-layer').remove();

    const countryData = aggregateDataByCountry(filteredData, continent).slice(0, 10); // Top 10 countries

    if (countryData.length === 0) return;

    const pie = d3.pie()
        .value(d => d.count)
        .sort(null)
        .padAngle(0.02);

    const countryArc = d3.arc()
        .innerRadius(baseRadius * 0.88)
        .outerRadius(baseRadius * 1.2);

    const countryLayer = g.append('g').attr('class', 'country-layer');

    // Setup color scale for countries
    countryColorScale.domain([0, countryData.length - 1]);

    const countryArcs = countryLayer.selectAll('.country-arc')
        .data(pie(countryData))
        .enter().append('g')
        .attr('class', 'country-arc');

    countryArcs.append('path')
        .attr('d', countryArc)
        .attr('fill', (d, i) => d3.interpolateViridis(i / (countryData.length - 1)))
        .attr('opacity', 0)
        .attr('stroke', '#0B1120')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .style('pointer-events', 'all')
        .transition()
        .duration(350)
        .attr('opacity', 0.95);

    // Better label positioning using the empty space - increased spacing
    countryArcs.append('text')
        .attr('transform', d => {
            const angle = d.endAngle - d.startAngle;
            // Position outside for better visibility
            const outerArc = d3.arc()
                .innerRadius(baseRadius * 1.35)
                .outerRadius(baseRadius * 1.35);
            return `translate(${outerArc.centroid(d)})`;
        })
        .attr('text-anchor', d => {
            const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            return midAngle < Math.PI ? 'start' : 'end';
        })
        .style('fill', '#F1F5F9')
        .style('font-size', d => {
            const angle = d.endAngle - d.startAngle;
            return angle > 0.2 ? '11px' : '9px';
        })
        .style('font-weight', '600')
        .style('pointer-events', 'none')
        .style('text-shadow', '0 2px 4px rgba(0, 0, 0, 0.9)')
        .style('opacity', 0)
        .text(d => {
            const angle = d.endAngle - d.startAngle;
            const maxLength = angle > 0.3 ? 12 : (angle > 0.15 ? 8 : 6);
            return d.data.country.substring(0, maxLength);
        })
        .transition()
        .duration(400)
        .style('opacity', 1);

    // Hover interactions for countries - focused view
    let countryHoverTimeout = null;

    countryArcs
        .on('mouseenter', function (event, d) {
            const country = d.data.country;

            // Clear any pending timeout
            if (countryHoverTimeout) {
                clearTimeout(countryHoverTimeout);
                countryHoverTimeout = null;
            }

            // Hide other countries, show only this one
            countryArcs.selectAll('path')
                .transition()
                .duration(250)
                .attr('opacity', cd => cd.data.country === country ? 1 : 0.1)
                .attr('stroke-width', cd => cd.data.country === country ? 3 : 2);

            countryArcs.selectAll('text')
                .transition()
                .duration(250)
                .style('opacity', cd => cd.data.country === country ? 1 : 0.15);

            // Show attack types for this country
            showAttackTypesFocused(g, country, continent, baseRadius, centerValue, centerLabel, deathValue, deathLabel);

            // Show tooltip
            const content = `
                <strong style="font-size: 14px;">${country}</strong><br/>
                <span style="color: #94A3B8;">${continent}</span><br/><br/>
                <span style="color: #ff7f00;">Incidents: ${d.data.count.toLocaleString()}</span><br/>
                <span style="color: #e41a1c;">Deaths: ${d.data.killed.toLocaleString()}</span><br/>
                <span style="color: #4daf4a;">Wounded: ${d.data.wounded.toLocaleString()}</span>
            `;
            showTip(event, d.data, content);
        })
        .on('mouseleave', function (event, d) {
            // Add generous delay to allow moving to attack layer
            countryHoverTimeout = setTimeout(() => {
                const attackLayer = g.select('.attack-layer').node();
                if (!attackLayer || !attackLayer.contains(event.relatedTarget)) {
                    // Restore all countries
                    countryArcs.selectAll('path')
                        .transition()
                        .duration(300)
                        .attr('opacity', 0.95)
                        .attr('stroke-width', 2);

                    countryArcs.selectAll('text')
                        .transition()
                        .duration(300)
                        .style('opacity', 1);

                    g.selectAll('.attack-layer')
                        .transition()
                        .duration(250)
                        .style('opacity', 0)
                        .remove();

                    // Restore country-level stats
                    const totalCount = d3.sum(countryData, d => d.count);
                    const totalKilled = d3.sum(countryData, d => d.killed);
                    centerValue.text(totalCount.toLocaleString());
                    centerLabel.text(`${continent} Incidents`);
                    deathValue.text(totalKilled.toLocaleString());
                    deathLabel.text('Deaths');
                }
            }, 400);
        });

    // Update center stats for continent
    const totalCount = d3.sum(countryData, d => d.count);
    const totalKilled = d3.sum(countryData, d => d.killed);
    centerValue.transition().duration(300).tween("text", function () {
        const i = d3.interpolate(parseInt(this.textContent.replace(/,/g, '')), totalCount);
        return function (t) { this.textContent = Math.round(i(t)).toLocaleString(); };
    });
    centerLabel.transition().duration(300).text(`${continent} Incidents`);
    deathValue.transition().duration(300).tween("text", function () {
        const i = d3.interpolate(parseInt(this.textContent.replace(/,/g, '')), totalKilled);
        return function (t) { this.textContent = Math.round(i(t)).toLocaleString(); };
    });
}

// Focused attack types view
function showAttackTypesFocused(g, country, continent, baseRadius, centerValue, centerLabel, deathValue, deathLabel) {
    // Remove existing attack layer
    g.selectAll('.attack-layer').remove();

    const attackData = aggregateDataByAttackType(filteredData, country);

    if (attackData.length === 0) return;

    const pie = d3.pie()
        .value(d => d.count)
        .sort(null)
        .padAngle(0.02);

    const attackArc = d3.arc()
        .innerRadius(baseRadius * 1.23)
        .outerRadius(baseRadius * 1.5);

    const attackLayer = g.append('g')
        .attr('class', 'attack-layer')
        .style('pointer-events', 'all'); // Ensure hover works

    const attackArcs = attackLayer.selectAll('.attack-arc')
        .data(pie(attackData))
        .enter().append('g')
        .attr('class', 'attack-arc');

    attackArcs.append('path')
        .attr('d', attackArc)
        .attr('fill', d => {
            const colors = attackTypeGradients[d.data.attackType] || ['#64748B', '#94A3B8'];
            return colors[0];
        })
        .attr('opacity', 0)
        .attr('stroke', '#0B1120')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .style('pointer-events', 'all')
        .transition()
        .duration(350)
        .attr('opacity', 0.95);

    // Add labels in the empty space outside - increased spacing
    attackArcs.append('text')
        .attr('transform', d => {
            const outerLabelArc = d3.arc()
                .innerRadius(baseRadius * 1.7)
                .outerRadius(baseRadius * 1.7);
            return `translate(${outerLabelArc.centroid(d)})`;
        })
        .attr('text-anchor', d => {
            const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            return midAngle < Math.PI ? 'start' : 'end';
        })
        .style('fill', '#F1F5F9')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('pointer-events', 'none')
        .style('text-shadow', '0 2px 4px rgba(0, 0, 0, 0.9)')
        .style('opacity', 0)
        .text(d => {
            const angle = d.endAngle - d.startAngle;
            // Abbreviate long attack type names
            const name = d.data.attackType;
            if (angle < 0.3) {
                // Very small slice - abbreviate
                return name.substring(0, 6) + '...';
            }
            return name.length > 15 ? name.substring(0, 12) + '...' : name;
        })
        .transition()
        .duration(400)
        .style('opacity', d => {
            const angle = d.endAngle - d.startAngle;
            return angle > 0.15 ? 1 : 0; // Hide very small labels
        });

    // Attack type hover with longer stability
    let attackHoverTimeout = null;

    attackArcs
        .on('mouseenter', function (event, d) {
            if (attackHoverTimeout) {
                clearTimeout(attackHoverTimeout);
                attackHoverTimeout = null;
            }

            d3.select(this).select('path')
                .transition()
                .duration(200)
                .attr('opacity', 1)
                .attr('stroke-width', 3)
                .attr('stroke', '#ff7f00');

            // Update center stats
            centerValue.text(d.data.count.toLocaleString());
            centerLabel.text(d.data.attackType);
            deathValue.text(d.data.killed.toLocaleString());
            deathLabel.text('Deaths');

            // Show tooltip with locations
            const incidents = filteredData.filter(inc =>
                inc.country === country && inc.attackType === d.data.attackType
            );
            const topCities = d3.rollup(incidents, v => v.length, inc => inc.city);
            const cityList = Array.from(topCities, ([city, count]) => ({ city, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3)
                .map(c => `${c.city} (${c.count})`)
                .join(', ');

            const content = `
                <strong style="font-size: 14px;">${d.data.attackType}</strong><br/>
                <span style="color: #94A3B8;">in ${country}, ${continent}</span><br/><br/>
                <span style="color: #ff7f00;">Incidents: ${d.data.count.toLocaleString()}</span><br/>
                <span style="color: #e41a1c;">Deaths: ${d.data.killed.toLocaleString()}</span><br/>
                <span style="color: #4daf4a;">Wounded: ${d.data.wounded.toLocaleString()}</span><br/><br/>
                <span style="font-size: 10px; color: #999999;">Top locations:</span><br/>
                <span style="font-size: 11px; color: #94A3B8;">${cityList || 'Various'}</span>
            `;
            showTip(event, d.data, content);
        })
        .on('mouseleave', function (event, d) {
            attackHoverTimeout = setTimeout(() => {
                d3.select(this).select('path')
                    .transition()
                    .duration(200)
                    .attr('opacity', 0.95)
                    .attr('stroke-width', 2)
                    .attr('stroke', '#0B1120');

                // Restore country stats
                const totalCount = d3.sum(attackData, d => d.count);
                const totalKilled = d3.sum(attackData, d => d.killed);
                centerValue.text(totalCount.toLocaleString());
                centerLabel.text(`${country} Incidents`);
                deathValue.text(totalKilled.toLocaleString());
                deathLabel.text('Deaths');
            }, 300);
        });

    // Update center stats
    const totalCount = d3.sum(attackData, d => d.count);
    const totalKilled = d3.sum(attackData, d => d.killed);
    centerValue.transition().duration(300).tween("text", function () {
        const i = d3.interpolate(parseInt(this.textContent.replace(/,/g, '')), totalCount);
        return function (t) { this.textContent = Math.round(i(t)).toLocaleString(); };
    });
    centerLabel.transition().duration(300).text(`${country} Incidents`);
    deathValue.transition().duration(300).tween("text", function () {
        const i = d3.interpolate(parseInt(this.textContent.replace(/,/g, '')), totalKilled);
        return function (t) { this.textContent = Math.round(i(t)).toLocaleString(); };
    });
}

// ==== UTILITY FUNCTIONS ====
function getTop(data, field, limit) {
    const counts = d3.rollup(data, v => v.length, d => d[field]);
    return Array.from(counts, ([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map(d => d.name);
}

function drag(simulation) {
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
}

// ==== CONTROLS ====
function setupControls() {
    function toggleAnimation() {
        if (isPlaying) {
            stopAnim();
        } else {
            // If already at end or not started, restart from start year
            if (currentYear >= endYear) {
                currentYear = startYear - 1; // Will be incremented to startYear in first iteration
            }
            startAnim();
        }
    }

    // Attach to button
    document.getElementById('playAnimation').addEventListener('click', toggleAnimation);

    // Start year range
    document.getElementById('startYearRange').addEventListener('input', function () {
        startYear = +this.value;
        document.getElementById('startYearDisplay').textContent = startYear;

        // Ensure end year is always >= start year
        if (endYear < startYear) {
            endYear = startYear;
            document.getElementById('endYearRange').value = endYear;
            document.getElementById('endYearDisplay').textContent = endYear;
        }

        // Update current year if it's out of range
        if (currentYear < startYear) {
            currentYear = startYear;
        }

        filterData();
    });

    // End year range
    document.getElementById('endYearRange').addEventListener('input', function () {
        endYear = +this.value;
        document.getElementById('endYearDisplay').textContent = endYear;

        // Ensure start year is always <= end year
        if (startYear > endYear) {
            startYear = endYear;
            document.getElementById('startYearRange').value = startYear;
            document.getElementById('startYearDisplay').textContent = startYear;
        }

        // Update current year if it's out of range
        if (currentYear > endYear) {
            currentYear = endYear;
        }

        document.getElementById('currentYear').textContent = currentYear;
        filterData();
    });

    document.getElementById('regionFilter').addEventListener('change', filterData);
    document.getElementById('countryFilter').addEventListener('change', filterData);
    document.getElementById('attackTypeFilter').addEventListener('change', filterData);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);

    document.querySelectorAll('input[name="metric"]').forEach(radio => {
        radio.addEventListener('change', updateHeatmap);
    });
}

function filterData() {
    const regionSelect = document.getElementById('regionFilter');
    const selectedRegions = Array.from(regionSelect.selectedOptions).map(o => o.value);
    const selectedCountry = document.getElementById('countryFilter').value;
    const attackType = document.getElementById('attackTypeFilter').value;

    filteredData = globalData.filter(d => {
        const yearMatch = d.year >= startYear && d.year <= endYear;
        const regionMatch = selectedRegions.includes('all') || selectedRegions.length === 0 || selectedRegions.includes(d.region);
        const countryMatch = selectedCountry === 'all' || (d.country || 'Unknown') === selectedCountry;
        const attackMatch = attackType === 'all' || d.attackType === attackType;
        return yearMatch && regionMatch && countryMatch && attackMatch;
    });

    updateAll();
}

// Auto zoom function removed - not needed without country filter

function resetFilters() {
    startYear = 1970;
    endYear = 2020;
    currentYear = 2020;
    document.getElementById('startYearRange').value = 1970;
    document.getElementById('startYearDisplay').textContent = 1970;
    document.getElementById('endYearRange').value = 2020;
    document.getElementById('endYearDisplay').textContent = 2020;
    document.getElementById('currentYear').textContent = 2020;
    document.getElementById('regionFilter').value = 'all';
    document.getElementById('countryFilter').value = 'all';
    document.getElementById('attackTypeFilter').value = 'all';
    filteredData = globalData;
    updateAll();
}

function startAnim() {
    isPlaying = true;
    document.getElementById('playIcon').textContent = '⏸';
    document.getElementById('playText').textContent = 'Pause';

    // Start from the beginning if at the end
    if (currentYear >= endYear) {
        currentYear = startYear - 1; // Will increment to startYear on first iteration
    }

    animationInterval = setInterval(() => {
        currentYear++;

        // Stop automatically at end year
        if (currentYear > endYear) {
            stopAnim();
            currentYear = endYear; // Ensure it stays at max
            return;
        }

        // Update UI elements with visual feedback
        const yearDisplay = document.getElementById('currentYear');
        yearDisplay.textContent = currentYear;
        yearDisplay.style.transform = 'scale(1.1)';
        setTimeout(() => {
            yearDisplay.style.transform = 'scale(1)';
        }, 200);

        // Update filtered data - respecting ALL active filters
        const regionSelect = document.getElementById('regionFilter');
        const selectedRegions = Array.from(regionSelect.selectedOptions).map(o => o.value);
        const selectedCountry = document.getElementById('countryFilter').value;
        const attackType = document.getElementById('attackTypeFilter').value;

        filteredData = globalData.filter(d => {
            // Show cumulative data from startYear to currentYear
            const yearMatch = d.year >= startYear && d.year <= currentYear;
            const regionMatch = selectedRegions.includes('all') || selectedRegions.length === 0 || selectedRegions.includes(d.region);
            const countryMatch = selectedCountry === 'all' || (d.country || 'Unknown') === selectedCountry;
            const attackMatch = attackType === 'all' || d.attackType === attackType;
            return yearMatch && regionMatch && countryMatch && attackMatch;
        });

        // Update all visualizations with error handling
        try {
            updateMap();
            updateSankey();
            updateHeatmap();
            updateAttackChart();
            updateDashboard();
        } catch (error) {
            console.error('Animation update error:', error);
            stopAnim(); // Stop animation on error
        }
    }, 500); // Slightly faster animation for better visualization
}

function stopAnim() {
    isPlaying = false;
    document.getElementById('playIcon').textContent = '▶';
    document.getElementById('playText').textContent = 'Animate';

    if (animationInterval) {
        clearInterval(animationInterval);
    }
}

function updateAll() {
    try {
        console.log('Updating map...');
        updateMap();
        console.log('Map updated');

        console.log('Updating sankey...');
        updateSankey();
        console.log('Sankey updated');

        console.log('Updating heatmap...');
        updateHeatmap();
        console.log('Heatmap updated');

        console.log('Updating network...');
        // updateNetwork(); // Replaced by Attack Chart
        if (typeof updateAttackChart === 'function') {
            updateAttackChart();
            console.log('Attack chart updated');
        } else {
            console.warn('updateAttackChart function missing');
        }


        console.log('Updating dashboard...');
        updateDashboard();
        console.log('Dashboard updated');
    } catch (error) {
        console.error('Error in updateAll:', error);
        throw error;
    }
}

function updateDashboard() {
    document.getElementById('totalIncidents').textContent = filteredData.length.toLocaleString();
    document.getElementById('totalCasualties').textContent =
        (d3.sum(filteredData, d => d.killed + d.wounded)).toLocaleString();
    document.getElementById('activeGroups').textContent =
        new Set(filteredData.map(d => d.groupName).filter(g => g !== 'Unknown')).size;
    document.getElementById('affectedRegions').textContent =
        new Set(filteredData.map(d => d.region)).size;
}

function showTip(event, d, content) {
    let tooltip = document.querySelector('.custom-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        document.body.appendChild(tooltip);
    }

    tooltip.style.opacity = 1;
    tooltip.style.left = event.pageX + 10 + 'px';
    tooltip.style.top = event.pageY + 10 + 'px';

    if (content) {
        tooltip.innerHTML = content;
    } else {
        tooltip.innerHTML = '<div class="tooltip-title">' + d.city + ', ' + d.country + '</div>' +
            '<div class="tooltip-content">' +
            '<strong>Attacks:</strong> ' + d.count + '<br>' +
            '<strong>Killed:</strong> ' + d.killed + '<br>' +
            '<strong>Wounded:</strong> ' + d.wounded + '<br>' +
            '<strong>Type:</strong> ' + d.attackType +
            '</div>';
    }
}

function hideTip() {
    const tooltip = document.querySelector('.custom-tooltip');
    if (tooltip) {
        tooltip.style.opacity = 0;
    }
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

// Responsive resize handler with debounce
let resizeTimeout;
function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        try {
            // Only update visualizations that need to be redrawn
            updateHeatmap();
            updateAttackChart();
            updateSankey();
            console.log('Visualizations resized');
        } catch (error) {
            console.error('Resize error:', error);
        }
    }, 250); // Debounce for 250ms
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Add resize listener for responsive behavior
window.addEventListener('resize', handleResize);
