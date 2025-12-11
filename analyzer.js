// Journey analysis utilities

class JourneyAnalyzer {
    constructor(db) {
        this.db = db;
    }

    // Detect dead ends (nodes with short duration and no children)
    async detectDeadEnds(journeyId, thresholdSeconds = 30) {
        const nodes = await this.db.getNodesByJourney(journeyId);
        const deadEnds = [];

        const childCounts = new Map();
        nodes.forEach(node => {
            if (node.parentId) {
                childCounts.set(node.parentId, (childCounts.get(node.parentId) || 0) + 1);
            }
        });

        nodes.forEach(node => {
            const hasChildren = childCounts.has(node.id);
            const durationSeconds = (node.duration || 0) / 1000;

            if (!hasChildren && durationSeconds < thresholdSeconds && durationSeconds > 0) {
                deadEnds.push({
                    nodeId: node.id,
                    url: node.url,
                    title: node.title,
                    duration: durationSeconds
                });
            }
        });

        return deadEnds;
    }

    // Calculate topic drift using keyword overlap
    async calculateTopicDrift(journeyId) {
        const tree = await this.db.buildJourneyTree(journeyId);
        if (!tree) return [];

        const driftScores = [];
        const rootKeywords = new Set(tree.metadata?.keywords || []);

        const traverseAndCalculate = (node, depth = 0) => {
            if (!node) return;

            if (depth > 0) {
                const nodeKeywords = new Set(node.metadata?.keywords || []);
                const overlap = this.calculateSetOverlap(rootKeywords, nodeKeywords);

                driftScores.push({
                    nodeId: node.id,
                    url: node.url,
                    title: node.title,
                    depth,
                    driftScore: 1 - overlap, // Higher score = more drift
                    similarity: overlap
                });
            }

            if (node.children) {
                node.children.forEach(child => traverseAndCalculate(child, depth + 1));
            }
        };

        traverseAndCalculate(tree);
        return driftScores.sort((a, b) => b.driftScore - a.driftScore);
    }

    // Calculate Jaccard similarity between two sets
    calculateSetOverlap(set1, set2) {
        if (set1.size === 0 && set2.size === 0) return 1;
        if (set1.size === 0 || set2.size === 0) return 0;

        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);

        return intersection.size / union.size;
    }

    // Generate journey insights
    async generateInsights(journeyId) {
        const nodes = await this.db.getNodesByJourney(journeyId);
        const stats = await this.db.getJourneyStats(journeyId);
        const deadEnds = await this.detectDeadEnds(journeyId);
        const driftScores = await this.calculateTopicDrift(journeyId);

        // Find longest path
        const tree = await this.db.buildJourneyTree(journeyId);
        const longestPath = this.findLongestPath(tree);

        // Find nodes with most time
        const nodesByTime = [...nodes]
            .sort((a, b) => (b.duration || 0) - (a.duration || 0))
            .slice(0, 5);

        // Find "Aha!" moments
        const ahaMoments = nodes.filter(node => node.metadata?.ahaMoment);

        // Calculate branch factor (avg children per node)
        const childCounts = new Map();
        nodes.forEach(node => {
            if (node.parentId) {
                childCounts.set(node.parentId, (childCounts.get(node.parentId) || 0) + 1);
            }
        });
        const avgBranchFactor = childCounts.size > 0
            ? Array.from(childCounts.values()).reduce((a, b) => a + b, 0) / childCounts.size
            : 0;

        return {
            summary: {
                totalNodes: stats.nodeCount,
                totalDuration: stats.totalDuration,
                maxDepth: stats.maxDepth,
                avgDuration: stats.avgDuration,
                avgBranchFactor: avgBranchFactor.toFixed(2)
            },
            deadEnds,
            topicDrift: {
                mostDrifted: driftScores.slice(0, 5),
                avgDrift: driftScores.length > 0
                    ? driftScores.reduce((sum, d) => sum + d.driftScore, 0) / driftScores.length
                    : 0
            },
            longestPath,
            mostTimeSpent: nodesByTime.map(n => ({
                nodeId: n.id,
                title: n.title,
                url: n.url,
                duration: n.duration
            })),
            ahaMoments: ahaMoments.map(n => ({
                nodeId: n.id,
                title: n.title,
                url: n.url,
                note: n.note
            }))
        };
    }

    // Find longest path from root to leaf
    findLongestPath(node, currentPath = []) {
        if (!node) return [];

        currentPath = [...currentPath, {
            nodeId: node.id,
            title: node.title,
            url: node.url
        }];

        if (!node.children || node.children.length === 0) {
            return currentPath;
        }

        const childPaths = node.children.map(child =>
            this.findLongestPath(child, currentPath)
        );

        return childPaths.reduce((longest, current) =>
            current.length > longest.length ? current : longest
            , []);
    }

    // Recommend next nodes based on patterns (placeholder for future ML)
    async recommendNextNodes(currentNodeId) {
        // Future enhancement: use collaborative filtering or ML
        // For now, return empty array
        return [];
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JourneyAnalyzer;
}
