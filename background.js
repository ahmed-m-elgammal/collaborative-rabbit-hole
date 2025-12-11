// Background service worker for Collaborative Rabbit Hole
// Handles tab tracking, journey management, and parent-child relationships

importScripts('db.js');

const db = new JourneyDB();
let currentJourneyId = null;
let activeTabId = null;
let tabStartTimes = new Map(); // Track when each tab became active
let tabNodes = new Map(); // Map tab IDs to node IDs
let tabParents = new Map(); // Track parent-child relationships

// Initialize database and restore state
chrome.runtime.onInstalled.addListener(async () => {
    console.log('Collaborative Rabbit Hole installed');
    await db.init();

    // Set default settings
    const trackingEnabled = await db.getSetting('trackingEnabled');
    if (trackingEnabled === undefined) {
        await db.setSetting('trackingEnabled', true);
        await db.setSetting('excludedDomains', ['banking.com', 'mail.google.com']); // Example defaults
    }
});

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
    await db.init();
    currentJourneyId = await db.getSetting('currentJourneyId');
});

// Ensure DB is ready
async function ensureDB() {
    if (!db.db) {
        await db.init();
    }
}

// Start a new journey
async function startNewJourney(title = 'Untitled Journey') {
    await ensureDB();

    const journey = {
        title,
        created: Date.now(),
        updated: Date.now(),
        tags: [],
        shared: false,
        rootNodeId: null
    };

    const journeyId = await db.createJourney(journey);
    currentJourneyId = journeyId;
    await db.setSetting('currentJourneyId', journeyId);

    // Clear tracking maps
    tabNodes.clear();
    tabParents.clear();
    tabStartTimes.clear();

    console.log('Started new journey:', journeyId);
    return journeyId;
}

// Check if URL should be tracked
async function shouldTrackURL(url) {
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
        return false;
    }

    const trackingEnabled = await db.getSetting('trackingEnabled');
    if (!trackingEnabled) {
        return false;
    }

    const excludedDomains = await db.getSetting('excludedDomains') || [];
    try {
        const hostname = new URL(url).hostname;
        return !excludedDomains.some(domain => hostname.includes(domain));
    } catch {
        return false;
    }
}

// Create a node for a tab
async function createNodeForTab(tabId, tab, parentTabId = null) {
    await ensureDB();

    if (!currentJourneyId) {
        await startNewJourney('Auto Journey');
    }

    if (!(await shouldTrackURL(tab.url))) {
        return null;
    }

    // Generate unique node ID
    const nodeId = `node_${tabId}_${Date.now()}`;

    // Determine parent node
    let parentId = null;
    if (parentTabId && tabNodes.has(parentTabId)) {
        parentId = tabNodes.get(parentTabId);
    }

    const node = {
        id: nodeId,
        journeyId: currentJourneyId,
        tabId,
        url: tab.url,
        title: tab.title || 'Loading...',
        parentId,
        timestamp: Date.now(),
        duration: 0,
        note: '',
        screenshot: null,
        metadata: {},
        children: []
    };

    await db.createNode(node);
    tabNodes.set(tabId, nodeId);

    // Update journey's root node if this is the first node
    const journey = await db.getJourney(currentJourneyId);
    if (!journey.rootNodeId) {
        journey.rootNodeId = nodeId;
        journey.updated = Date.now();
        await db.updateJourney(journey);
    }

    console.log('✓ Created node:', nodeId, 'tab:', tabId, 'parent:', parentId, 'parentTab:', parentTabId);
    return nodeId;
}

// Update node duration when tab becomes inactive
async function updateNodeDuration(tabId) {
    if (!tabNodes.has(tabId) || !tabStartTimes.has(tabId)) {
        return;
    }

    const nodeId = tabNodes.get(tabId);
    const startTime = tabStartTimes.get(tabId);
    const duration = Date.now() - startTime;

    const node = await db.getNode(nodeId);
    if (node) {
        node.duration = (node.duration || 0) + duration;
        await db.updateNode(node);
        console.log('Updated duration for node:', nodeId, 'duration:', node.duration);
    }

    tabStartTimes.delete(tabId);
}

// Capture screenshot of active tab
async function captureScreenshot(tabId) {
    try {
        const dataUrl = await chrome.tabs.captureVisibleTab(null, {
            format: 'png',
            quality: 50
        });

        if (tabNodes.has(tabId)) {
            const nodeId = tabNodes.get(tabId);
            const node = await db.getNode(nodeId);
            if (node) {
                node.screenshot = dataUrl;
                await db.updateNode(node);
            }
        }
    } catch (error) {
        console.error('Failed to capture screenshot:', error);
    }
}

// Tab event listeners

// Track tab creation - IMPORTANT: This captures openerTabId immediately
chrome.tabs.onCreated.addListener(async (tab) => {
    console.log('🆕 Tab created:', tab.id, 'openerTabId:', tab.openerTabId);

    // Store opener relationship immediately (this is the most reliable source)
    if (tab.openerTabId) {
        tabParents.set(tab.id, tab.openerTabId);
        console.log('  ➜ Stored parent:', tab.openerTabId, '→', tab.id);
    }
});

// Track tab updates (navigation)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('📄 Tab complete:', tabId, tab.url.substring(0, 50) + '...');

        // Check if this tab already has a node
        if (!tabNodes.has(tabId)) {
            // Try to determine parent tab from our stored relationships
            let parentTabId = tabParents.get(tabId);

            // Fallback: check tab.openerTabId if we don't have it yet
            if (!parentTabId && tab.openerTabId) {
                parentTabId = tab.openerTabId;
                tabParents.set(tabId, parentTabId);
                console.log('  ➜ Found parent via tab.openerTabId:', parentTabId);
            }

            if (parentTabId) {
                console.log('  ➜ Creating node WITH parent:', parentTabId);
            } else {
                console.log('  ➜ Creating node WITHOUT parent (root or orphan)');
            }

            await createNodeForTab(tabId, tab, parentTabId);

            // Capture screenshot after page loads
            if (tab.active) {
                setTimeout(() => captureScreenshot(tabId), 1000);
            }
        } else {
            // Update existing node with new title
            const nodeId = tabNodes.get(tabId);
            const node = await db.getNode(nodeId);
            if (node && node.title === 'Loading...') {
                node.title = tab.title || tab.url;
                await db.updateNode(node);
            }
        }
    }
});

// Track active tab changes (for duration tracking)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    console.log('👁️ Tab activated:', activeInfo.tabId);

    // Update duration for previously active tab
    if (activeTabId !== null && activeTabId !== activeInfo.tabId) {
        await updateNodeDuration(activeTabId);
    }

    // Start tracking time for new active tab
    activeTabId = activeInfo.tabId;
    tabStartTimes.set(activeTabId, Date.now());

    // Capture screenshot of newly active tab
    setTimeout(() => captureScreenshot(activeTabId), 500);
});

// Track tab removal
chrome.tabs.onRemoved.addListener(async (tabId) => {
    console.log('🗑️ Tab removed:', tabId);

    // Update duration before removing
    await updateNodeDuration(tabId);

    // Clean up tracking maps
    tabNodes.delete(tabId);
    tabParents.delete(tabId);

    if (activeTabId === tabId) {
        activeTabId = null;
    }
});

// Track web navigation to detect parent-child relationships (backup method)
chrome.webNavigation.onCreatedNavigationTarget.addListener(async (details) => {
    // This event fires when a link is clicked to open in a new tab
    console.log('🔗 Navigation target:', details.tabId, 'from:', details.sourceTabId);

    if (details.sourceTabId) {
        // Only set if not already set (openerTabId from onCreated takes precedence)
        if (!tabParents.has(details.tabId)) {
            tabParents.set(details.tabId, details.sourceTabId);
            console.log('  ➜ Stored parent via webNavigation:', details.sourceTabId, '→', details.tabId);
        }
    }
});

// Message handling for popup and other components
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        await ensureDB();

        switch (message.type) {
            case 'START_JOURNEY':
                const journeyId = await startNewJourney(message.title);
                sendResponse({ success: true, journeyId });
                break;

            case 'GET_CURRENT_JOURNEY':
                if (currentJourneyId) {
                    const journey = await db.getJourney(currentJourneyId);
                    const stats = await db.getJourneyStats(currentJourneyId);
                    sendResponse({ journey, stats });
                } else {
                    sendResponse({ journey: null, stats: null });
                }
                break;

            case 'GET_CURRENT_NODE':
                if (activeTabId && tabNodes.has(activeTabId)) {
                    const nodeId = tabNodes.get(activeTabId);
                    const node = await db.getNode(nodeId);
                    sendResponse({ node });
                } else {
                    sendResponse({ node: null });
                }
                break;

            case 'ADD_NOTE':
                if (message.nodeId) {
                    const node = await db.getNode(message.nodeId);
                    if (node) {
                        node.note = message.note;
                        await db.updateNode(node);
                        sendResponse({ success: true });
                    }
                } else if (activeTabId && tabNodes.has(activeTabId)) {
                    const nodeId = tabNodes.get(activeTabId);
                    const node = await db.getNode(nodeId);
                    if (node) {
                        node.note = message.note;
                        await db.updateNode(node);
                        sendResponse({ success: true });
                    }
                }
                break;

            case 'GET_JOURNEY_TREE':
                if (message.journeyId) {
                    const tree = await db.buildJourneyTree(message.journeyId);
                    sendResponse({ tree });
                }
                break;

            case 'GET_ALL_JOURNEYS':
                const journeys = await db.getAllJourneys();
                sendResponse({ journeys });
                break;

            case 'TAG_AHA_MOMENT':
                if (message.nodeId) {
                    const node = await db.getNode(message.nodeId);
                    if (node) {
                        node.metadata = node.metadata || {};
                        node.metadata.ahaMoment = true;
                        await db.updateNode(node);
                        sendResponse({ success: true });
                    }
                }
                break;

            default:
                sendResponse({ error: 'Unknown message type' });
        }
    })();

    return true; // Keep message channel open for async response
});

console.log('🐰 Background service worker loaded - Rabbit Hole tracking active!');
