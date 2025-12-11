// Journey Playback Feature
// Animates journey chronologically showing how browsing progressed

class JourneyPlayback {
    constructor(db, visualizer) {
        this.db = db;
        this.visualizer = visualizer;
        this.isPlaying = false;
        this.currentIndex = 0;
        this.speed = 1; // 1x speed
        this.timeline = [];
        this.interval = null;
    }

    // Initialize playback for a journey
    async init(journeyId) {
        const nodes = await this.db.getNodesByJourney(journeyId);

        // Sort nodes by timestamp
        this.timeline = nodes.sort((a, b) => a.timestamp - b.timestamp);
        this.currentIndex = 0;

        console.log('Playback timeline initialized with', this.timeline.length, 'nodes');
    }

    // Start playback
    play() {
        if (this.isPlaying) return;
        if (this.timeline.length === 0) return;

        this.isPlaying = true;
        this.interval = setInterval(() => {
            this.step();
        }, 1000 / this.speed); // Adjust interval based on speed

        console.log('Playback started at speed:', this.speed);
    }

    // Pause playback
    pause() {
        this.isPlaying = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        console.log('Playback paused');
    }

    // Step to next node in timeline
    step() {
        if (this.currentIndex >= this.timeline.length) {
            this.pause();
            this.reset();
            return;
        }

        const node = this.timeline[this.currentIndex];

        // Highlight current node in visualization
        this.visualizer.highlightNode(node.id);

        // Show node details
        this.visualizer.showNodeDetails(node);

        this.currentIndex++;

        // Update progress
        const progress = (this.currentIndex / this.timeline.length) * 100;
        this.updateProgress(progress);
    }

    // Reset playback to beginning
    reset() {
        this.pause();
        this.currentIndex = 0;
        this.updateProgress(0);
        console.log('Playback reset');
    }

    // Set playback speed
    setSpeed(speed) {
        this.speed = speed;
        if (this.isPlaying) {
            this.pause();
            this.play(); // Restart with new speed
        }
    }

    // Seek to specific position
    seekTo(index) {
        this.currentIndex = Math.max(0, Math.min(index, this.timeline.length - 1));
        if (!this.isPlaying) {
            const node = this.timeline[this.currentIndex];
            this.visualizer.highlightNode(node.id);
            this.visualizer.showNodeDetails(node);
        }
    }

    // Update progress UI
    updateProgress(percentage) {
        const progressSlider = document.getElementById('playbackProgress');
        const currentTime = document.getElementById('playbackTime');
        const totalTime = document.getElementById('playbackTotal');

        if (progressSlider) {
            progressSlider.value = percentage;
        }

        if (currentTime && this.timeline.length > 0) {
            const elapsed = this.currentIndex;
            currentTime.textContent = elapsed + ' nodes';
        }

        if (totalTime && this.timeline.length > 0) {
            totalTime.textContent = this.timeline.length + ' nodes';
        }
    }

    // Get playback info
    getInfo() {
        return {
            isPlaying: this.isPlaying,
            currentIndex: this.currentIndex,
            totalNodes: this.timeline.length,
            speed: this.speed,
            progress: this.timeline.length > 0 ? (this.currentIndex / this.timeline.length) * 100 : 0
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JourneyPlayback;
}
