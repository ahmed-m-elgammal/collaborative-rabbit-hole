// Popup script for Collaborative Rabbit Hole

const db = new JourneyDB();
let currentJourney = null;
let currentNode = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await db.init();
    await loadCurrentJourney();
    await loadRecentJourneys();
    setupEventListeners();
});

// Load current journey data
async function loadCurrentJourney() {
    chrome.runtime.sendMessage({ type: 'GET_CURRENT_JOURNEY' }, async (response) => {
        if (response && response.journey) {
            currentJourney = response.journey;
            const stats = response.stats;

            displayJourneyStatus(currentJourney, stats);
        } else {
            displayNoJourney();
        }
    });

    // Load current page/node
    chrome.runtime.sendMessage({ type: 'GET_CURRENT_NODE' }, (response) => {
        if (response && response.node) {
            currentNode = response.node;
            displayCurrentPage(currentNode);
        }
    });
}

// Display journey status
function displayJourneyStatus(journey, stats) {
    document.getElementById('journeyTitle').textContent = journey.title;
    document.getElementById('nodeCount').textContent = stats.nodeCount;
    document.getElementById('duration').textContent = formatDuration(stats.totalDuration);
    document.getElementById('depth').textContent = stats.maxDepth;
}

// Display no active journey
function displayNoJourney() {
    document.getElementById('journeyTitle').textContent = 'No Active Journey';
    document.getElementById('nodeCount').textContent = '0';
    document.getElementById('duration').textContent = '0m';
    document.getElementById('depth').textContent = '0';
}

// Display current page info
function displayCurrentPage(node) {
    if (node) {
        document.getElementById('currentPageTitle').textContent = node.title || node.url;
        document.getElementById('noteInput').value = node.note || '';
    } else {
        document.getElementById('currentPageTitle').textContent = 'No page tracked';
        document.getElementById('noteInput').value = '';
    }
}

// Load recent journeys
async function loadRecentJourneys() {
    chrome.runtime.sendMessage({ type: 'GET_ALL_JOURNEYS' }, async (response) => {
        if (response && response.journeys && response.journeys.length > 0) {
            const journeys = response.journeys
                .sort((a, b) => b.updated - a.updated)
                .slice(0, 5);

            displayRecentJourneys(journeys);
        }
    });
}

// Display recent journeys list
async function displayRecentJourneys(journeys) {
    const listContainer = document.getElementById('journeyList');
    listContainer.innerHTML = '';

    for (const journey of journeys) {
        const stats = await db.getJourneyStats(journey.id);

        const item = document.createElement('div');
        item.className = 'journey-item';
        item.innerHTML = `
      <div class="journey-item-header">
        <h4>${journey.title}</h4>
        <span class="journey-date">${formatDate(journey.updated)}</span>
      </div>
      <div class="journey-item-stats">
        <span>${stats.nodeCount} pages</span>
        <span>•</span>
        <span>${formatDuration(stats.totalDuration)}</span>
      </div>
    `;

        item.addEventListener('click', () => {
            viewJourneyVisualization(journey.id);
        });

        listContainer.appendChild(item);
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('startJourneyBtn').addEventListener('click', startNewJourney);
    document.getElementById('saveNoteBtn').addEventListener('click', saveNote);
    document.getElementById('ahaMomentBtn').addEventListener('click', tagAhaMoment);
    document.getElementById('viewVisualizationBtn').addEventListener('click', () => viewJourneyVisualization());
    document.getElementById('exportLink').addEventListener('click', exportJourney);
}

// Start a new journey
function startNewJourney() {
    const title = prompt('Enter a title for your journey:', 'New Journey');
    if (title) {
        chrome.runtime.sendMessage({
            type: 'START_JOURNEY',
            title
        }, (response) => {
            if (response && response.success) {
                loadCurrentJourney();
                showNotification('Journey started! Start browsing to build your map.');
            }
        });
    }
}

// Save note for current page
function saveNote() {
    const note = document.getElementById('noteInput').value;

    if (currentNode) {
        chrome.runtime.sendMessage({
            type: 'ADD_NOTE',
            nodeId: currentNode.id,
            note
        }, (response) => {
            if (response && response.success) {
                showNotification('Note saved!');
            }
        });
    } else {
        showNotification('No page is currently being tracked', 'error');
    }
}

// Tag current page as "Aha! Moment"
function tagAhaMoment() {
    if (currentNode) {
        chrome.runtime.sendMessage({
            type: 'TAG_AHA_MOMENT',
            nodeId: currentNode.id
        }, (response) => {
            if (response && response.success) {
                showNotification('⭐ Marked as Aha! Moment');
            }
        });
    } else {
        showNotification('No page is currently being tracked', 'error');
    }
}

// View journey visualization
function viewJourneyVisualization(journeyId = null) {
    const url = chrome.runtime.getURL('visualization/visualization.html') +
        (journeyId ? `?journeyId=${journeyId}` : '');
    chrome.tabs.create({ url });
}

// Export journey
async function exportJourney() {
    if (!currentJourney) {
        showNotification('No active journey to export', 'error');
        return;
    }

    const tree = await db.buildJourneyTree(currentJourney.id);
    const exportData = {
        journey: currentJourney,
        tree: tree,
        exportedAt: Date.now()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
        url,
        filename: `journey_${currentJourney.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`,
        saveAs: true
    });

    showNotification('Journey exported!');
}

// Utility: Format duration
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m`;
    } else {
        return `${seconds}s`;
    }
}

// Utility: Format date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

// Utility: Show notification
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

  // Settings link
  document.getElementById('settingsLink').addEventListener('click', (e) => {
    e.preventDefault();
    const url = chrome.runtime.getURL('settings/settings.html');
    chrome.tabs.create({ url });
  });
