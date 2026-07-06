import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock IndexedDB and window before import
vi.stubGlobal("indexedDB", undefined);
vi.stubGlobal("window", {
  ...globalThis.window,
  CacheManager: null,
});

// We need to create fresh instances to test properly since the module
// creates a singleton and calls init() on import. We'll import the module
// and work with it, resetting state between tests.
import cacheManager from "../../../services/cacheManager.js";

describe("OptimizedCacheManager", () => {
  beforeEach(() => {
    // Reset internal state
    cacheManager.cache.clear();
    cacheManager.accessOrder = [];
    cacheManager.isIndexedDBAvailable = false;
    cacheManager.db = null;
    localStorage.clear();
  });

  it("should set and get a value", async () => {
    await cacheManager.set("test-key", { name: "test" });
    const result = await cacheManager.get("test-key");

    expect(result).toEqual({ name: "test" });
  });

  it("should return null for missing keys", async () => {
    const result = await cacheManager.get("nonexistent");
    expect(result).toBeNull();
  });

  it("should delete a cached entry", async () => {
    await cacheManager.set("key1", "value1");
    await cacheManager.delete("key1");

    const result = await cacheManager.get("key1");
    expect(result).toBeNull();
  });

  it("should clear all cached entries", async () => {
    await cacheManager.set("key1", "value1");
    await cacheManager.set("key2", "value2");

    await cacheManager.clear();

    expect(cacheManager.cache.size).toBe(0);
    expect(cacheManager.accessOrder).toHaveLength(0);
  });

  it("should check if key exists with has()", async () => {
    await cacheManager.set("exists", "yes");

    expect(await cacheManager.has("exists")).toBe(true);
    expect(await cacheManager.has("nope")).toBe(false);
  });

  it("should return all keys", async () => {
    await cacheManager.set("a", 1);
    await cacheManager.set("b", 2);

    const keys = cacheManager.keys();
    expect(keys).toContain("a");
    expect(keys).toContain("b");
  });

  it("should expire entries based on TTL", async () => {
    await cacheManager.set("expiring", "data", { ttl: 1 }); // 1ms TTL

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await cacheManager.get("expiring");
    expect(result).toBeNull();
  });

  it("should track access order for LRU", async () => {
    await cacheManager.set("first", 1);
    await cacheManager.set("second", 2);
    await cacheManager.set("third", 3);

    // Access "first" to make it most recently used
    await cacheManager.get("first");

    // "first" should now be last in accessOrder
    expect(cacheManager.accessOrder[cacheManager.accessOrder.length - 1]).toBe("first");
  });

  it("should return cache statistics", async () => {
    await cacheManager.set("stat-key", { data: "test" });

    const stats = cacheManager.getStats();
    expect(stats.entries).toBe(1);
    expect(stats.totalSize).toBeGreaterThan(0);
    expect(stats.maxSize).toBe(5 * 1024 * 1024);
    expect(stats.utilization).toBeGreaterThan(0);
  });

  it("should evict LRU entries when capacity is exceeded", async () => {
    // Create a manager-like scenario with very small max entries
    const originalMaxEntries = cacheManager.options.maxEntries;
    cacheManager.options.maxEntries = 3;

    await cacheManager.set("a", "1");
    await cacheManager.set("b", "2");
    await cacheManager.set("c", "3");
    // This should trigger eviction of "a" (least recently used)
    await cacheManager.set("d", "4");

    expect(cacheManager.cache.has("a")).toBe(false);
    expect(await cacheManager.get("d")).toBe("4");

    cacheManager.options.maxEntries = originalMaxEntries;
  });
});
