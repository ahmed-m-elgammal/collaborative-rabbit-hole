// Visualization script for Collaborative Rabbit Hole
// Uses D3.js for interactive force-directed graph

const db = new JourneyDB();
const analyzer = new JourneyAnalyzer(db);

let currentJourneyId = null;
let journeyTree = null;
let simulation = null;
let svg, g, link, node, nodeLabels;
let transform = d3.zoomIdentity;
let selectedNode = null;
let colorMode = 'time';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await db.init();
    await initVisualization();
    await loadJourneysList();
    setupEventListeners();

    // Check for journey ID in URL params
    const params = new URLSearchParams(window.location.search);
    const journeyId = params.get('journeyId');
    if (journeyId) {
        currentJourneyId = parseInt(journeyId);
        await loadJourney(currentJourneyId);
    }
});

// Initialize D3 visualization
function initVisualization() {
    const container = document.getElementById('journeyGraph');
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg = d3.select('#journeyGraph')
        .attr('width', width)
        .attr('height', height);

    // Create zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            transform = event.transform;
            g.attr('transform', transform);
        });

    svg.call(zoom);

    // Create main group
    g = svg.append('g');

    // Create arrow marker for links
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .append('svg:path')
        .attr('d', 'M 0,-5 L 10,0 L 0,5')
        .attr('fill', '#64748b');

    // Create force simulation
    simulation = d3.forceSimulation()
        .force('link', d3.forceLink().id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30));
}

// Load journeys list
async function loadJourneysList() {
    const journeys = await db.getAllJourneys();
    const select = document.getElementById('journeySelect');

    select.innerHTML = '<option value="">Select a journey...</option>';

    journeys.sort((a, b) => b.updated - a.updated).forEach(journey => {
        const option = document.createElement('option');
        option.value = journey.id;
        option.textContent = journey.title;
        select.appendChild(option);
    });

    if (currentJourneyId) {
        select.value = currentJourneyId;
    }
}

// Load and visualize journey
async function loadJourney(journeyId) {
    showLoading(true);

    try {
        currentJourneyId = journeyId;

        // Get journey data
        const journey = await db.getJourney(journeyId);
        const stats = await db.getJourneyStats(journeyId);
        journeyTree = await db.buildJourneyTree(journeyId);

        // Update UI
        updateJourneyInfo(journey, stats);

        // Generate insights
        await generateInsights(journeyId);

        // Visualize
        if (journeyTree) {
            visualizeJourney(journeyTree);
        }
    } catch (error) {
        console.error('Error loading journey:', error);
    } finally {
        showLoading(false);
    }
}

// Update journey info panel
function updateJourneyInfo(journey, stats) {
    document.getElementById('journeyTitle').textContent = journey.title;
    document.getElementById('infoNodes').textContent = stats.nodeCount;
    document.getElementById('infoDuration').textContent = formatDuration(stats.totalDuration);
    document.getElementById('infoDepth').textContent = stats.maxDepth;

    // Calculate branch count
    const nodes = flattenTree(journeyTree);
    const branchCount = nodes.filter(n => n.children && n.children.length > 1).length;
    document.getElementById('infoBranches').textContent = branchCount;
}

// Generate and display insights
async function generateInsights(journeyId) {
    const insights = await analyzer.generateInsights(journeyId);
    const container = document.getElementById('insightsList');
    container.innerHTML = '';

    // Dead ends
    if (insights.deadEnds.length > 0) {
        const item = createInsightItem(
            '⚠️ Dead Ends',
            `${insights.deadEnds.length} pages with quick exits`,
            'warning'
        );
        container.appendChild(item);
    }

    // Aha moments
    if (insights.ahaMoments.length > 0) {
        const item = createInsightItem(
            '⭐ Aha! Moments',
            `${insights.ahaMoments.length} breakthrough discoveries`,
            'success'
        );
        container.appendChild(item);
    }

    // Topic drift
    if (insights.topicDrift.avgDrift > 0.5) {
        const item = createInsightItem(
            '🌀 Topic Drift',
            `High drift detected (${(insights.topicDrift.avgDrift * 100).toFixed(0)}%)`,
            'info'
        );
        container.appendChild(item);
    }

    // Deep rabbit hole
    if (insights.summary.maxDepth >= 5) {
        const item = createInsightItem(
            '🐰 Deep Rabbit Hole',
            `Explored ${insights.summary.maxDepth} levels deep`,
            'info'
        );
        container.appendChild(item);
    }
}

function createInsightItem(title, description, type = 'info') {
    const item = document.createElement('div');
    item.className = `insight-item insight-${type}`;
    item.innerHTML = `
    <div class="insight-title">${title}</div>
    <div class="insight-desc">${description}</div>
  `;
    return item;
}

// Flatten tree to array of nodes
function flattenTree(node, arr = []) {
    if (!node) return arr;
    arr.push(node);
    if (node.children) {
        node.children.forEach(child => flattenTree(child, arr));
    }
    return arr;
}

// Visualize journey as D3 force-directed graph
function visualizeJourney(tree) {
    // Convert tree to nodes and links
    const nodes = flattenTree(tree);
    const links = [];

    nodes.forEach(node => {
        if (node.children) {
            node.children.forEach(child => {
                links.push({ source: node.id, target: child.id });
            });
        }
    });

    // Clear previous visualization
    g.selectAll('*').remove();

    // Create links
    link = g.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('class', 'link')
        .attr('stroke', '#475569')
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#arrowhead)');

    // Create nodes
    node = g.append('g')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('class', 'node')
        .attr('r', d => d.metadata?.ahaMoment ? 12 : 10)
        .attr('fill', d => getNodeColor(d))
        .attr('stroke', d => getNodeStroke(d))
        .attr('stroke-width', d => d.metadata?.ahaMoment ? 3 : 2)
        .call(drag(simulation))
        .on('click', (event, d) => showNodeDetails(d))
        .on('mouseover', function () {
            d3.select(this).attr('r', d => d.metadata?.ahaMoment ? 14 : 12);
        })
        .on('mouseout', function () {
            d3.select(this).attr('r', d => d.metadata?.ahaMoment ? 12 : 10);
        });

    // Create labels
    nodeLabels = g.append('g')
        .selectAll('text')
        .data(nodes)
        .join('text')
        .attr('class', 'node-label')
        .attr('text-anchor', 'middle')
        .attr('dy', -15)
        .attr('fill', '#cbd5e1')
        .attr('font-size', '12px')
        .text(d => truncateText(d.title, 30));

    // Update simulation
    simulation.nodes(nodes).on('tick', ticked);
    simulation.force('link').links(links);
    simulation.alpha(1).restart();
}

// Tick function for simulation
function ticked() {
    link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

    node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

    nodeLabels
        .attr('x', d => d.x)
        .attr('y', d => d.y);
}

// Get node color based on mode
function getNodeColor(node) {
    const showDeadEnds = document.getElementById('showDeadEnds').checked;
    const showAha = document.getElementById('showAhaMoments').checked;

    // Check for special states first
    if (showAha && node.metadata?.ahaMoment) {
        return '#fbbf24'; // Gold for aha moments
    }

    if (showDeadEnds && node.duration && node.duration < 30000 && (!node.children || node.children.length === 0)) {
        return '#ef4444'; // Red for dead ends
    }

    // Color by mode
    switch (colorMode) {
        case 'time':
            return getHeatColor(node.duration || 0, 0, 300000); // 0-5 minutes
        case 'depth':
            const depth = calculateNodeDepth(node);
            return getDepthColor(depth);
        case 'drift':
            // TODO: implement drift coloring
            return '#8b5cf6';
        default:
            return '#8b5cf6';
    }
}

// Get node stroke color
function getNodeStroke(node) {
    if (node.metadata?.ahaMoment) {
        return '#fbbf24';
    }
    return '#1e293b';
}

// Heat color scale (blue to red)
function getHeatColor(value, min, max) {
    const normalized = Math.min(1, (value - min) / (max - min));
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444'];
    const index = Math.floor(normalized * (colors.length - 1));
    return colors[index];
}

// Depth color scale
function getDepthColor(depth) {
    const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c026d3', '#d946ef'];
    return colors[Math.min(depth, colors.length - 1)];
}

// Calculate node depth from root
function calculateNodeDepth(node, depth = 0) {
    if (!node.parentId) return 0;
    // This is simplified - in practice we'd traverse from root
    return depth;
}

// Drag behavior
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

// Show node details panel
function showNodeDetails(node) {
    selectedNode = node;
    const panel = document.getElementById('nodeDetailPanel');

    document.getElementById('nodeDetailTitle').textContent = node.title;
    document.getElementById('nodeDetailUrl').textContent = node.url;
    document.getElementById('nodeDetailUrl').href = node.url;
    document.getElementById('nodeDetailDuration').textContent = formatDuration(node.duration || 0);
    document.getElementById('nodeDetailDepth').textContent = calculateNodeDepth(node);

    // Note
    if (node.note) {
        document.getElementById('nodeDetailNote').textContent = node.note;
        document.getElementById('nodeDetailNoteSection').style.display = 'block';
    } else {
        document.getElementById('nodeDetailNoteSection').style.display = 'none';
    }

    // Screenshot
    if (node.screenshot) {
        document.getElementById('nodeDetailScreenshot').src = node.screenshot;
        document.getElementById('nodeDetailScreenshotSection').style.display = 'block';
    } else {
        document.getElementById('nodeDetailScreenshotSection').style.display = 'none';
    }

    panel.classList.add('show');
}

// Setup event listeners
function setupEventListeners() {
    // Journey selector
    document.getElementById('journeySelect').addEventListener('change', (e) => {
        if (e.target.value) {
            loadJourney(parseInt(e.target.value));
        }
    });

    // Zoom controls
    document.getElementById('zoomInBtn').addEventListener('click', () => {
        svg.transition().call(
            d3.zoom().transform,
            transform.scale(1.2)
        );
    });

    document.getElementById('zoomOutBtn').addEventListener('click', () => {
        svg.transition().call(
            d3.zoom().transform,
            transform.scale(0.8)
        );
    });

    document.getElementById('zoomResetBtn').addEventListener('click', () => {
        svg.transition().call(
            d3.zoom().transform,
            d3.zoomIdentity
        );
    });

    // Color mode
    document.getElementById('colorMode').addEventListener('change', (e) => {
        colorMode = e.target.value;
        if (journeyTree) {
            visualizeJourney(journeyTree);
        }
    });

    // Checkboxes
    document.getElementById('showDeadEnds').addEventListener('change', () => {
        if (journeyTree) visualizeJourney(journeyTree);
    });

    document.getElementById('showAhaMoments').addEventListener('change', () => {
        if (journeyTree) visualizeJourney(journeyTree);
    });

    // Close panel
    document.getElementById('closePanelBtn').addEventListener('click', () => {
        document.getElementById('nodeDetailPanel').classList.remove('show');
    });

    // Visit node
    document.getElementById('visitNodeBtn').addEventListener('click', () => {
        if (selectedNode) {
            window.open(selectedNode.url, '_blank');
        }
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', exportCurrentJourney);

    // Close button
    document.getElementById('closeBtn').addEventListener('click', () => {
        window.close();
    });
}

// Export journey
async function exportCurrentJourney() {
    if (!currentJourneyId) return;

    const journey = await db.getJourney(currentJourneyId);
    const tree = await db.buildJourneyTree(currentJourneyId);

    const exportData = {
        journey,
        tree,
        exportedAt: Date.now()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journey_${journey.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
    a.click();
}

// Utility functions
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}
