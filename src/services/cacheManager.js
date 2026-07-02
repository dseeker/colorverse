/**
 * Optimized Cache Manager for ColorVerse
 * Features:
 * - LRU (Least Recently Used) eviction policy
 * - IndexedDB fallback for larger storage
 * - TTL (Time To Live) support
 * - Data compression for large entries
 * - Cache size management
 */

class OptimizedCacheManager {
  constructor(options = {}) {
    this.options = {
      maxSize: 5 * 1024 * 1024, // 5MB max cache size
      maxEntries: 1000,
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
      compressionThreshold: 1024, // Compress entries larger than 1KB
      ...options,
    };

    this.cache = new Map();
    this.accessOrder = [];
    this.db = null;
    this.dbName = "ColorVerseCache";
    this.storeName = "cacheStore";
    this.isIndexedDBAvailable = "indexedDB" in window;
  }

  /**
   * Initialize the cache manager
   */
  async init() {
    if (this.isIndexedDBAvailable) {
      await this.initIndexedDB();
    }
    this.loadFromLocalStorage();
    console.log("[CacheManager] Initialized");
  }

  /**
   * Initialize IndexedDB
   */
  initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.warn("[CacheManager] IndexedDB not available, using localStorage");
        this.isIndexedDBAvailable = false;
        resolve();
      };

      request.onsuccess = event => {
        this.db = event.target.result;
        console.log("[CacheManager] IndexedDB initialized");
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "key" });
        }
      };
    });
  }

  /**
   * Get item from cache
   */
  async get(key) {
    // Check memory cache first
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);

      // Check if expired
      if (entry.expires && Date.now() > entry.expires) {
        this.delete(key);
        return null;
      }

      // Update access order (LRU)
      this.updateAccessOrder(key);
      return this.decompress(entry.value);
    }

    // Try IndexedDB
    if (this.isIndexedDBAvailable && this.db) {
      try {
        const entry = await this.getFromIndexedDB(key);
        if (entry) {
          // Restore to memory cache
          this.cache.set(key, entry);
          this.updateAccessOrder(key);
          return this.decompress(entry.value);
        }
      } catch (error) {
        console.warn("[CacheManager] IndexedDB get failed:", error);
      }
    }

    return null;
  }

  /**
   * Set item in cache
   */
  async set(key, value, options = {}) {
    const ttl = options.ttl || this.options.defaultTTL;
    const compressed = this.compress(value);

    const entry = {
      key,
      value: compressed,
      size: JSON.stringify(compressed).length,
      created: Date.now(),
      expires: ttl ? Date.now() + ttl : null,
      accessCount: 0,
    };

    // Check if we need to evict items
    await this.ensureSpace(entry.size);

    // Store in memory
    this.cache.set(key, entry);
    this.updateAccessOrder(key);

    // Store in IndexedDB for persistence
    if (this.isIndexedDBAvailable && this.db) {
      try {
        await this.setInIndexedDB(entry);
      } catch (error) {
        console.warn("[CacheManager] IndexedDB set failed:", error);
      }
    }

    // Also store in localStorage as fallback
    this.saveToLocalStorage();

    return true;
  }

  /**
   * Delete item from cache
   */
  async delete(key) {
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);

    if (this.isIndexedDBAvailable && this.db) {
      try {
        await this.deleteFromIndexedDB(key);
      } catch (error) {
        console.warn("[CacheManager] IndexedDB delete failed:", error);
      }
    }

    this.saveToLocalStorage();
  }

  /**
   * Check if key exists and is not expired
   */
  async has(key) {
    const entry = await this.get(key);
    return entry !== null;
  }

  /**
   * Get all cache keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Clear all cache
   */
  async clear() {
    this.cache.clear();
    this.accessOrder = [];

    if (this.isIndexedDBAvailable && this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        await store.clear();
      } catch (error) {
        console.warn("[CacheManager] IndexedDB clear failed:", error);
      }
    }

    localStorage.removeItem("colorverse-cache-metadata");
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let totalSize = 0;
    this.cache.forEach(entry => {
      totalSize += entry.size;
    });

    return {
      entries: this.cache.size,
      totalSize,
      maxSize: this.options.maxSize,
      utilization: (totalSize / this.options.maxSize) * 100,
    };
  }

  /**
   * Ensure there's enough space for new entry (LRU eviction)
   */
  async ensureSpace(requiredSize) {
    const stats = this.getStats();

    // Evict entries until we have enough space
    while (stats.totalSize + requiredSize > this.options.maxSize && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        const entry = this.cache.get(oldestKey);
        if (entry) {
          stats.totalSize -= entry.size;
          await this.delete(oldestKey);
          console.log("[CacheManager] Evicted LRU entry:", oldestKey);
        }
      }
    }

    // Also check max entries limit
    while (this.cache.size >= this.options.maxEntries && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        await this.delete(oldestKey);
        console.log("[CacheManager] Evicted entry (max entries):", oldestKey);
      }
    }
  }

  /**
   * Update access order for LRU
   */
  updateAccessOrder(key) {
    // Remove from current position
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    // Add to end (most recently used)
    this.accessOrder.push(key);

    // Update access count
    const entry = this.cache.get(key);
    if (entry) {
      entry.accessCount++;
    }
  }

  /**
   * Compress data if it's large enough
   */
  compress(data) {
    const json = JSON.stringify(data);
    if (json.length > this.options.compressionThreshold) {
      // Simple compression: remove whitespace and encode
      // In production, you could use LZ-string or similar
      return {
        compressed: true,
        data: json.replace(/\s+/g, ""),
      };
    }
    return { compressed: false, data };
  }

  /**
   * Decompress data
   */
  decompress(compressed) {
    if (compressed.compressed) {
      return JSON.parse(compressed.data);
    }
    return compressed.data;
  }

  /**
   * Get from IndexedDB
   */
  getFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Set in IndexedDB
   */
  setInIndexedDB(entry) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete from IndexedDB
   */
  deleteFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load cache metadata from localStorage
   */
  loadFromLocalStorage() {
    try {
      const metadata = localStorage.getItem("colorverse-cache-metadata");
      if (metadata) {
        const parsed = JSON.parse(metadata);
        this.accessOrder = parsed.accessOrder || [];
      }
    } catch (error) {
      console.warn("[CacheManager] Failed to load from localStorage:", error);
    }
  }

  /**
   * Save cache metadata to localStorage
   */
  saveToLocalStorage() {
    try {
      const metadata = {
        accessOrder: this.accessOrder,
        timestamp: Date.now(),
      };
      localStorage.setItem("colorverse-cache-metadata", JSON.stringify(metadata));
    } catch (error) {
      console.warn("[CacheManager] Failed to save to localStorage:", error);
    }
  }

  /**
   * Prefetch items for faster access
   */
  async prefetch(keys) {
    const promises = keys.map(async key => {
      const value = await this.get(key);
      if (value) {
        console.log("[CacheManager] Prefetched:", key);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Warm cache with critical data
   */
  async warmCache(data) {
    const promises = Object.entries(data).map(([key, value]) => this.set(key, value));
    await Promise.all(promises);
    console.log("[CacheManager] Cache warmed with", Object.keys(data).length, "entries");
  }
}

// Create global instance
const cacheManager = new OptimizedCacheManager();
window.CacheManager = cacheManager;

// Initialize
cacheManager.init();

export default cacheManager;
