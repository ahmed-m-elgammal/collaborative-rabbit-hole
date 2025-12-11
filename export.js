// Export and Import functionality for journeys

class JourneyExporter {
    constructor(db) {
        this.db = db;
    }

    // Export journey to JSON
    async exportJourney(journeyId, includeScreenshots = false) {
        const journey = await this.db.getJourney(journeyId);
        const nodes = await this.db.getNodesByJourney(journeyId);
        const tree = await this.db.buildJourneyTree(journeyId);

        // Optionally strip screenshots to reduce file size
        const processedNodes = nodes.map(node => {
            const nodeCopy = { ...node };
            if (!includeScreenshots) {
                delete nodeCopy.screenshot;
            }
            return nodeCopy;
        });

        const exportData = {
            version: '1.0',
            journey: journey,
            nodes: processedNodes,
            tree: tree,
            exportedAt: Date.now(),
            metadata: {
                extension: 'Collaborative Rabbit Hole',
                format: 'journey-export-v1'
            }
        };

        return exportData;
    }

    // Generate shareable code (compressed JSON)
    async generateShareCode(journeyId) {
        const data = await this.exportJourney(journeyId, false);
        const json = JSON.stringify(data);
        const compressed = this.compressString(json);
        return btoa(compressed).substring(0, 12); // Generate short code
    }

    // Import journey from JSON
    async importJourney(importData) {
        try {
            // Validate format
            if (!importData.version || !importData.journey || !importData.nodes) {
                throw new Error('Invalid journey format');
            }

            // Create new journey
            const newJourney = {
                ...importData.journey,
                created: Date.now(),
                updated: Date.now(),
                shared: true
            };
            delete newJourney.id; // Remove old ID

            const newJourneyId = await this.db.createJourney(newJourney);

            // Import nodes with new IDs
            const idMapping = {};

            for (const node of importData.nodes) {
                const oldId = node.id;
                const newNodeId = `node_imported_${Date.now()}_${Math.random()}`;

                const newNode = {
                    ...node,
                    id: newNodeId,
                    journeyId: newJourneyId
                };

                // Update parent reference if exists
                if (newNode.parentId && idMapping[newNode.parentId]) {
                    newNode.parentId = idMapping[newNode.parentId];
                }

                await this.db.createNode(newNode);
                idMapping[oldId] = newNodeId;
            }

            // Update journey's root node
            const journey = await this.db.getJourney(newJourneyId);
            if (importData.journey.rootNodeId && idMapping[importData.journey.rootNodeId]) {
                journey.rootNodeId = idMapping[importData.journey.rootNodeId];
                await this.db.updateJourney(journey);
            }

            return newJourneyId;
        } catch (error) {
            console.error('Import failed:', error);
            throw error;
        }
    }

    // Privacy filtering - exclude sensitive domains
    async exportWithPrivacyFilter(journeyId, excludedDomains = []) {
        const data = await this.exportJourney(journeyId, false);

        // Filter nodes
        data.nodes = data.nodes.filter(node => {
            try {
                const url = new URL(node.url);
                return !excludedDomains.some(domain => url.hostname.includes(domain));
            } catch {
                return false;
            }
        });

        return data;
    }

    // Simple string compression (placeholder - could use pako.js for real compression)
    compressString(str) {
        // This is a very basic compression, in production use a library like pako
        return str.split('').map(c => c.charCodeAt(0)).join(',');
    }

    // Download as file
    downloadAsFile(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JourneyExporter;
}
