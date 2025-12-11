// Settings page script

const db = new JourneyDB();
let settings = {};

// Default settings
const defaultSettings = {
    trackingEnabled: true,
    autoStartJourney: true,
    screenshotsEnabled: true,
    screenshotQuality: 50,
    maxScreenshotAge: 30,
    autoExcludeSensitive: true,
    excludedDomains: ['banking.com', 'mail.google.com'],
    maxJourneyAge: 90,
    defaultJourneyName: 'Journey {date}'
};

// Sensitive domains list (auto-excluded if enabled)
const sensitiveDomains = [
    'bank', 'chase.com', 'wellsfargo.com', 'bankofamerica.com',
    'paypal.com', 'venmo.com', 'healthcare', 'medical',
    'therapy', 'health.google.com', 'privatehealth'
];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await db.init();
    await loadSettings();
    setupEventListeners();
    await calculateStorageUsage();
});

// Load settings from database
async function loadSettings() {
    // Load each setting
    for (const key of Object.keys(defaultSettings)) {
        const value = await db.getSetting(key);
        settings[key] = value !== undefined ? value : defaultSettings[key];
    }

    // Populate UI
    document.getElementById('trackingEnabled').checked = settings.trackingEnabled;
    document.getElementById('autoStartJourney').checked = settings.autoStartJourney;
    document.getElementById('screenshotsEnabled').checked = settings.screenshotsEnabled;
    document.getElementById('screenshotQuality').value = settings.screenshotQuality;
    document.getElementById('maxScreenshotAge').value = settings.maxScreenshotAge;
    document.getElementById('autoExcludeSensitive').checked = settings.autoExcludeSensitive;
    document.getElementById('maxJourneyAge').value = settings.maxJourneyAge;
    document.getElementById('defaultJourneyName').value = settings.defaultJourneyName;

    // Excluded domains (array to string)
    const domains = Array.isArray(settings.excludedDomains)
        ? settings.excludedDomains.join('\n')
        : settings.excludedDomains;
    document.getElementById('excludedDomains').value = domains;
}

// Save settings to database
async function saveSettings() {
    // Gather values from UI
    settings.trackingEnabled = document.getElementById('trackingEnabled').checked;
    settings.autoStartJourney = document.getElementById('autoStartJourney').checked;
    settings.screenshotsEnabled = document.getElementById('screenshotsEnabled').checked;
    settings.screenshotQuality = parseInt(document.getElementById('screenshotQuality').value);
    settings.maxScreenshotAge = parseInt(document.getElementById('maxScreenshotAge').value);
    settings.autoExcludeSensitive = document.getElementById('autoExcludeSensitive').checked;
    settings.maxJourneyAge = parseInt(document.getElementById('maxJourneyAge').value);
    settings.defaultJourneyName = document.getElementById('defaultJourneyName').value;

    // Parse excluded domains
    const domainsText = document.getElementById('excludedDomains').value;
    settings.excludedDomains = domainsText
        .split('\n')
        .map(d => d.trim())
        .filter(d => d.length > 0);

    // Add sensitive domains if auto-exclude is enabled
    if (settings.autoExcludeSensitive) {
        settings.excludedDomains = [...new Set([...settings.excludedDomains, ...sensitiveDomains])];
    }

    // Save to database
    for (const [key, value] of Object.entries(settings)) {
        await db.setSetting(key, value);
    }

    showNotification('Settings saved successfully!', 'success');
}

// Calculate and display storage usage
async function calculateStorageUsage() {
    try {
        const journeys = await db.getAllJourneys();
        let totalNodes = 0;
        let totalScreenshots = 0;
        let screenshotSize = 0;

        for (const journey of journeys) {
            const nodes = await db.getNodesByJourney(journey.id);
            totalNodes += nodes.length;

            nodes.forEach(node => {
                if (node.screenshot) {
                    totalScreenshots++;
                    // Rough estimate of screenshot size in bytes
                    screenshotSize += node.screenshot.length;
                }
            });
        }

        const sizeMB = (screenshotSize / 1024 / 1024).toFixed(2);
        const info = `${totalNodes} nodes, ${totalScreenshots} screenshots (~${sizeMB} MB)`;
        document.getElementById('storageInfo').textContent = info;
    } catch (error) {
        console.error('Error calculating storage:', error);
        document.getElementById('storageInfo').textContent = 'Error calculating usage';
    }
}

// Clean old screenshots
async function cleanOldScreenshots() {
    const maxAge = settings.maxScreenshotAge;
    if (maxAge === 0) {
        showNotification('Auto-delete is disabled', 'warning');
        return;
    }

    const cutoffDate = Date.now() - (maxAge * 24 * 60 * 60 * 1000);
    const journeys = await db.getAllJourneys();
    let removedCount = 0;

    for (const journey of journeys) {
        const nodes = await db.getNodesByJourney(journey.id);

        for (const node of nodes) {
            if (node.screenshot && node.timestamp < cutoffDate) {
                node.screenshot = null;
                await db.updateNode(node);
                removedCount++;
            }
        }
    }

    showNotification(`Removed ${removedCount} old screenshots`, 'success');
    await calculateStorageUsage();
}

// Export all journeys
async function exportAll() {
    const journeys = await db.getAllJourneys();
    const exportData = {
        version: '1.0',
        exportedAt: Date.now(),
        journeys: []
    };

    for (const journey of journeys) {
        const nodes = await db.getNodesByJourney(journey.id);
        exportData.journeys.push({
            journey,
            nodes
        });
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rabbit_hole_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('All journeys exported!', 'success');
}

// Import journeys
async function importJourneys(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.journeys || !Array.isArray(data.journeys)) {
            throw new Error('Invalid backup file format');
        }

        let importedCount = 0;

        for (const item of data.journeys) {
            // Create new journey
            const newJourney = {
                ...item.journey,
                created: Date.now(),
                updated: Date.now()
            };
            delete newJourney.id;

            const journeyId = await db.createJourney(newJourney);

            // Import nodes
            const idMapping = {};
            for (const node of item.nodes) {
                const oldId = node.id;
                const newNodeId = `node_imported_${Date.now()}_${Math.random()}`;

                const newNode = {
                    ...node,
                    id: newNodeId,
                    journeyId: journeyId
                };

                if (newNode.parentId && idMapping[newNode.parentId]) {
                    newNode.parentId = idMapping[newNode.parentId];
                }

                await db.createNode(newNode);
                idMapping[oldId] = newNodeId;
            }

            importedCount++;
        }

        showNotification(`Imported ${importedCount} journeys!`, 'success');
    } catch (error) {
        console.error('Import error:', error);
        showNotification('Failed to import: ' + error.message, 'error');
    }
}

// Delete all data
async function deleteAllData() {
    const confirmed = confirm(
        '⚠️ DELETE ALL DATA?\n\n' +
        'This will permanently delete ALL your journeys, nodes, and settings.\n\n' +
        'This action CANNOT be undone!\n\n' +
        'Click OK to delete everything, or Cancel to keep your data.'
    );

    if (!confirmed) return;

    // Double confirmation
    const doubleConfirm = confirm('Are you ABSOLUTELY SURE? This is your last chance!');
    if (!doubleConfirm) return;

    try {
        const journeys = await db.getAllJourneys();

        for (const journey of journeys) {
            await db.deleteNodesByJourney(journey.id);
            await db.deleteJourney(journey.id);
        }

        showNotification('All data deleted', 'success');
        setTimeout(() => window.close(), 2000);
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Failed to delete data: ' + error.message, 'error');
    }
}

// Reset to defaults
async function resetToDefaults() {
    const confirmed = confirm('Reset all settings to default values?');
    if (!confirmed) return;

    for (const [key, value] of Object.entries(defaultSettings)) {
        await db.setSetting(key, value);
    }

    await loadSettings();
    showNotification('Settings reset to defaults', 'success');
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('saveBtn').addEventListener('click', saveSettings);
    document.getElementById('cleanScreenshotsBtn').addEventListener('click', cleanOldScreenshots);
    document.getElementById('exportAllBtn').addEventListener('click', exportAll);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importJourneys(e.target.files[0]);
        }
    });
    document.getElementById('deleteAllBtn').addEventListener('click', deleteAllData);
    document.getElementById('resetDefaultsBtn').addEventListener('click', resetToDefaults);
    document.getElementById('closeBtn').addEventListener('click', () => window.close());
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
