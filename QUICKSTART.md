# 🚀 Quick Start Guide

## Installation (2 minutes)

1. **Open Chrome Extensions**
   - Type `chrome://extensions/` in address bar
   - Press Enter

2. **Enable Developer Mode**
   - Toggle the switch in top-right corner

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to and select this folder: `collaborative-rabbit-hole`
   - Click "Select Folder"

4. **Pin the Extension** (Optional)
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Collaborative Rabbit Hole"
   - Click the pin icon

## First Use

**Start Tracking:**
1. Click the 🐰 extension icon
2. Click "Start New Journey"
3. Start browsing! Each tab you open becomes a node

**Add Notes:**
1. Visit a page worth remembering
2. Click extension icon
3. Type note in text box
4. Click "Save Note"
5. Tag special discoveries with "⭐ Aha! Moment"

**View Your Journey:**
1. Click "View Journey Map" in popup
2. Explore the interactive graph:
   - **Scroll** to zoom
   - **Drag background** to pan
   - **Click nodes** for details
   - **Drag nodes** to rearrange

**Change Colors:**
- Use "Color by" dropdown for different views:
  - **Time Spent**: See where you lingered (blue → red)
  - **Depth**: How deep into the rabbit hole
  - **Topic Drift**: How far from starting topic

**Export & Share:**
1. Click "Export Journey" button
2. JSON file downloads
3. Share with friends (they can import it!)

## Tips

- 💡 Dead ends (red nodes) show pages you quickly left
- ⭐ Aha moments (gold) highlight breakthroughs
- 🔍 Click any node to see URL, notes, and screenshot
- 📊 Sidebar shows live journey statistics

## Troubleshooting

**Extension not working?**
- Check `chrome://extensions/` for errors
- Refresh the extension (toggle off/on)
- Check service worker at `chrome://serviceworker-internals/`

**Journeys not saving?**
- Open DevTools (F12) → Application → IndexedDB
- Look for "RabbitHoleDB"
- Check if data is being stored

**Graph not rendering?**
- Ensure D3.js loaded (`lib/d3.min.js` exists)
- Check console for JavaScript errors (F12 → Console)

---

**Happy exploring! 🐰🕳️**
