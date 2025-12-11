// Database wrapper for IndexedDB
class JourneyDB {
  constructor() {
    this.dbName = 'RabbitHoleDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Journeys store
        if (!db.objectStoreNames.contains('journeys')) {
          const journeyStore = db.createObjectStore('journeys', { keyPath: 'id', autoIncrement: true });
          journeyStore.createIndex('created', 'created', { unique: false });
          journeyStore.createIndex('updated', 'updated', { unique: false });
        }

        // Nodes store
        if (!db.objectStoreNames.contains('nodes')) {
          const nodeStore = db.createObjectStore('nodes', { keyPath: 'id' });
          nodeStore.createIndex('journeyId', 'journeyId', { unique: false });
          nodeStore.createIndex('parentId', 'parentId', { unique: false });
          nodeStore.createIndex('timestamp', 'timestamp', { unique: false });
          nodeStore.createIndex('url', 'url', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // Journey operations
  async createJourney(journey) {
    const tx = this.db.transaction(['journeys'], 'readwrite');
    const store = tx.objectStore('journeys');
    const request = store.add(journey);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getJourney(id) {
    const tx = this.db.transaction(['journeys'], 'readonly');
    const store = tx.objectStore('journeys');
    const request = store.get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateJourney(journey) {
    const tx = this.db.transaction(['journeys'], 'readwrite');
    const store = tx.objectStore('journeys');
    const request = store.put(journey);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllJourneys() {
    const tx = this.db.transaction(['journeys'], 'readonly');
    const store = tx.objectStore('journeys');
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteJourney(id) {
    const tx = this.db.transaction(['journeys'], 'readwrite');
    const store = tx.objectStore('journeys');
    const request = store.delete(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Node operations
  async createNode(node) {
    const tx = this.db.transaction(['nodes'], 'readwrite');
    const store = tx.objectStore('nodes');
    const request = store.add(node);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getNode(id) {
    const tx = this.db.transaction(['nodes'], 'readonly');
    const store = tx.objectStore('nodes');
    const request = store.get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateNode(node) {
    const tx = this.db.transaction(['nodes'], 'readwrite');
    const store = tx.objectStore('nodes');
    const request = store.put(node);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getNodesByJourney(journeyId) {
    const tx = this.db.transaction(['nodes'], 'readonly');
    const store = tx.objectStore('nodes');
    const index = store.index('journeyId');
    const request = index.getAll(journeyId);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteNode(id) {
    const tx = this.db.transaction(['nodes'], 'readwrite');
    const store = tx.objectStore('nodes');
    const request = store.delete(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteNodesByJourney(journeyId) {
    const nodes = await this.getNodesByJourney(journeyId);
    const tx = this.db.transaction(['nodes'], 'readwrite');
    const store = tx.objectStore('nodes');
    
    nodes.forEach(node => {
      store.delete(node.id);
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Settings operations
  async getSetting(key) {
    const tx = this.db.transaction(['settings'], 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  async setSetting(key, value) {
    const tx = this.db.transaction(['settings'], 'readwrite');
    const store = tx.objectStore('settings');
    const request = store.put({ key, value });
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Journey tree construction
  async buildJourneyTree(journeyId) {
    const nodes = await this.getNodesByJourney(journeyId);
    const nodeMap = new Map();
    
    // Create map of all nodes
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    // Build tree structure
    let root = null;
    nodeMap.forEach(node => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId).children.push(node);
      } else {
        root = node; // Node without parent is root
      }
    });

    return root;
  }

  // Statistics
  async getJourneyStats(journeyId) {
    const nodes = await this.getNodesByJourney(journeyId);
    
    const totalDuration = nodes.reduce((sum, node) => sum + (node.duration || 0), 0);
    const maxDepth = this.calculateMaxDepth(await this.buildJourneyTree(journeyId));
    
    return {
      nodeCount: nodes.length,
      totalDuration,
      maxDepth,
      avgDuration: nodes.length > 0 ? totalDuration / nodes.length : 0
    };
  }

  calculateMaxDepth(node, depth = 0) {
    if (!node || !node.children || node.children.length === 0) {
      return depth;
    }
    return Math.max(...node.children.map(child => this.calculateMaxDepth(child, depth + 1)));
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JourneyDB;
}
