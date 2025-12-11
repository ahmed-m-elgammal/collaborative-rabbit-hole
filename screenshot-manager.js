// Screenshot utility for better management

class ScreenshotManager {
    constructor(db) {
        this.db = db;
    }

    // Compress screenshot data URL
    async compressScreenshot(dataUrl, quality = 50) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Resize to max 800px width while maintaining aspect ratio
                const maxWidth = 800;
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height / width) * maxWidth;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to JPEG with quality setting
                const compressed = canvas.toDataURL('image/jpeg', quality / 100);
                resolve(compressed);
            };
            img.src = dataUrl;
        });
    }

    // Check if screenshot size is acceptable
    isScreenshotSizeAcceptable(dataUrl, maxSizeKB = 500) {
        const sizeKB = (dataUrl.length * 0.75) / 1024;
        return sizeKB <= maxSizeKB;
    }

    // Remove screenshots older than X days
    async removeOldScreenshots(maxAgeDays) {
        if (maxAgeDays === 0) return 0;

        const cutoffDate = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
        const journeys = await this.db.getAllJourneys();
        let removedCount = 0;

        for (const journey of journeys) {
            const nodes = await this.db.getNodesByJourney(journey.id);

            for (const node of nodes) {
                if (node.screenshot && node.timestamp < cutoffDate) {
                    node.screenshot = null;
                    await this.db.updateNode(node);
                    removedCount++;
                }
            }
        }

        return removedCount;
    }

    // Get total screenshot storage size
    async calculateScreenshotSize() {
        const journeys = await this.db.getAllJourneys();
        let totalSize = 0;
        let count = 0;

        for (const journey of journeys) {
            const nodes = await this.db.getNodesByJourney(journey.id);

            nodes.forEach(node => {
                if (node.screenshot) {
                    totalSize += node.screenshot.length;
                    count++;
                }
            });
        }

        return {
            count,
            bytes: totalSize,
            megabytes: (totalSize / 1024 / 1024).toFixed(2)
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScreenshotManager;
}
