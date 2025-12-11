# 🐰 Collaborative Rabbit Hole

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/collaborative-rabbit-hole)
[![Chrome](https://img.shields.io/badge/chrome-extension-4285F4?logo=googlechrome&logoColor=white)](https://chrome.google.com/webstore)

A Chrome extension that tracks your browsing journey through "rabbit holes" of research and exploration. Visualize how you discover information, share your learning paths, and collaborate with others on knowledge discovery.

## Quick Links
📖 [Installation](#installation) | 🚀 [Quick Start](QUICKSTART.md) | 🤝 [Contributing](CONTRIBUTING.md) | 📊 [Features](#features)

## Screenshots

<p align="center">
  <i>📸 Screenshots coming soon! The extension features an interactive D3.js visualization dashboard, journey tracking popup, and comprehensive settings page.</i>
</p>


## Features

### 🎯 Core Tracking
- **Automatic Journey Mapping**: Every tab you open becomes a node in your journey tree
- **Parent-Child Relationships**: Tracks which pages led you to others
- **Time Tracking**: Monitors how long you spend on each page
- **Screenshot Capture**: Saves visual thumbnails of pages you visit
- **Smart Metadata**: Extracts titles, keywords, and semantic information

### 📊 Advanced Analysis
- **Dead End Detection**: Identifies pages you quickly abandoned
- **Topic Drift Meter**: Shows how far you've wandered from your starting point
- **Journey Insights**: Statistics on depth, breadth, and exploration patterns
- **"Aha! Moments"**: Tag breakthrough discoveries for later review

### 🎨 Interactive Visualization
- **D3.js Force Graph**: Beautiful, interactive network visualization
- **Multiple Color Modes**: 
  - Heat map by time spent
  - Depth-based coloring
  - Topic drift visualization
- **Zoom & Pan**: Explore large journeys easily
- **Node Details**: Click any node to see URL, notes, screenshots, and metadata

### 🤝 Sharing & Privacy
- **Export Journeys**: Save as JSON for sharing or backup
- **Privacy First**: All data stored locally in IndexedDB
- **Domain Filtering**: Exclude sensitive sites (banking, medical, etc.)
- **Three Privacy Modes**:
  - Private (default)
  - Friends only
  - Public/Anonymous

## Installation

### Load Unpacked (Development)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `collaborative-rabbit-hole` directory
6. The extension icon should appear in your Chrome toolbar

### From Chrome Web Store
*(Coming soon)*

## How to Use

### Starting a Journey

1. Click the Rabbit Hole extension icon
2. Click "Start New Journey" (or it will auto-start when you begin browsing)
3. Browse normally - every new tab from a tracked page is automatically added

### Adding Notes

1. Visit a page you want to annotate
2. Click the extension icon
3. Type your note in the text area
4. Click "Save Note"
5. Tag special pages as "Aha! Moments" ⭐

### Viewing Your Journey

1. Click "View Journey Map" in the popup
2. Explore the interactive graph:
   - **Hover** over nodes to highlight
   - **Click** nodes to see details
   - **Drag** nodes to rearrange
   - **Scroll** to zoom in/out
   - **Pan** by dragging the background

### Customization

**Color Modes:**
- **Time Spent**: Blue (quick visit) → Red (long stay)
- **Depth**: Shows how deep into the rabbit hole you went
- **Topic Drift**: Highlights semantic distance from starting topic

**Controls:**
- Toggle "Highlight Dead Ends" to mark abandoned pages
- Toggle "Highlight Aha! Moments" to emphasize discoveries
- Zoom controls for detailed exploration

### Exporting & Sharing

1. Click "Export Journey" in the visualization dashboard
2. Save the JSON file
3. Share with others (they can import via the extension)
4. Privacy filtering automatically excludes sensitive domains

## Architecture

### Core Files

- **manifest.json**: Extension configuration and permissions
- **background.js**: Service worker for tab tracking and journey management
- **db.js**: IndexedDB wrapper for data persistence
- **content.js**: Metadata extraction from web pages
- **analyzer.js**: Journey analysis (dead ends, topic drift, insights)
- **export.js**: Import/export functionality

### UI Components

- **popup/**: Extension popup interface
  - Current journey stats
  - Note-taking
  - Quick actions
  
- **visualization/**: Full-page dashboard
  - D3.js force-directed graph
  - Journey insights
  - Controls and filters

### Data Structure

**Journey:**
```json
{
  "id": 1,
  "title": "Coffee Research",
  "created": 1234567890,
  "updated": 1234567890,
  "rootNodeId": "node_123",
  "tags": [],
  "shared": false
}
```

**Node:**
```json
{
  "id": "node_123",
  "journeyId": 1,
  "url": "https://example.com",
  "title": "Page Title",
  "parentId": "node_122",
  "timestamp": 1234567890,
  "duration": 45000,
  "note": "Interesting insight...",
  "screenshot": "data:image/png;base64,...",
  "metadata": {
    "keywords": ["coffee", "history"],
    "ahaMoment": false
  }
}
```

## Privacy & Permissions

This extension requires these permissions:
- **tabs**: Track tab creation and navigation
- **history**: Build journey relationships
- **storage**: Save journeys locally (IndexedDB)
- **webNavigation**: Detect parent-child tab relationships
- **scripting**: Extract page metadata
- **<all_urls>**: Capture screenshots

**Your data is NEVER sent to external servers.** Everything is stored locally in your browser's IndexedDB.

### Excluded by Default
- Chrome internal pages (`chrome://`)
- Extension pages
- Customizable domain blacklist (add banking, medical sites, etc.)

## Roadmap

- [ ] Real-time "Research Parties" (collaborative exploration)
- [ ] AI summaries of journey nodes
- [ ] Automatic topic tagging using ML
- [ ] Fork/merge shared journeys
- [ ] Branch prediction ("3 people went here next")
- [ ] Mobile companion app
- [ ] Browser sync across devices

## Development

### Setup
```bash
cd collaborative-rabbit-hole
# No build step required - pure JavaScript
```

### Testing
1. Load extension in Chrome (see Installation above)
2. Browse some pages
3. Check background service worker logs: `chrome://serviceworker-internals/`
4. Inspect popup: Right-click extension icon → "Inspect popup"
5. Check IndexedDB: DevTools → Application → IndexedDB → RabbitHoleDB


### Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:
- Setting up your development environment
- Code style and standards
- How to submit issues and pull requests
- Testing guidelines

Please read the guide before submitting your first contribution.

## Tech Stack

- **Chrome Extension Manifest V3**
- **Vanilla JavaScript** (ES6+)
- **IndexedDB** for data persistence
- **D3.js v7** for visualization
- **CSS with modern features** (Grid, Flexbox, CSS Variables)

## Credits

Created with ❤️ for curious minds who love diving down rabbit holes.

## License

MIT License - feel free to use, modify, and share!

---

**Happy Exploring! 🐰🕳️**
