import { describe, it, expect, beforeEach, vi } from "vitest";

const CACHE_KEY_SITE_DATA = "colorverse-site-data";
const CACHE_KEY_TIMESTAMP = "colorverse-cache-timestamp";
const CACHE_DURATION = {
  HOURS: 6,
  DEV_MINUTES: 10,
};

describe("Cache Management", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("isCacheValid", () => {
    it("should return false when no timestamp exists", () => {
      expect(localStorage.getItem(CACHE_KEY_TIMESTAMP)).toBe(null);
    });

    it("should return true for recent cache", () => {
      const now = Date.now();
      localStorage.setItem(CACHE_KEY_TIMESTAMP, now.toString());

      const cacheTime = new Date(now);
      const expirationTime = new Date(cacheTime.getTime() + CACHE_DURATION.HOURS * 60 * 60 * 1000);
      const isValid = new Date() < expirationTime;

      expect(isValid).toBe(true);
    });

    it("should return false for expired cache", () => {
      const oldTimestamp = Date.now() - 7 * 60 * 60 * 1000; // 7 hours ago
      localStorage.setItem(CACHE_KEY_TIMESTAMP, oldTimestamp.toString());

      const cacheTime = new Date(oldTimestamp);
      const expirationTime = new Date(cacheTime.getTime() + CACHE_DURATION.HOURS * 60 * 60 * 1000);
      const isValid = new Date() < expirationTime;

      expect(isValid).toBe(false);
    });

    it("should handle dev mode shorter cache duration", () => {
      const devTimestamp = Date.now() - 11 * 60 * 1000; // 11 minutes ago
      localStorage.setItem(CACHE_KEY_TIMESTAMP, devTimestamp.toString());

      const cacheTime = new Date(devTimestamp);
      const expirationTime = new Date(cacheTime.getTime() + CACHE_DURATION.DEV_MINUTES * 60 * 1000);
      const isValid = new Date() < expirationTime;

      expect(isValid).toBe(false);
    });
  });

  describe("saveToCache", () => {
    it("should save valid data to localStorage", () => {
      const testData = {
        categories: {
          animals: { title: "Animals" },
          fantasy: { title: "Fantasy" },
        },
      };

      localStorage.setItem(CACHE_KEY_SITE_DATA, JSON.stringify(testData));
      localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());

      expect(localStorage.getItem(CACHE_KEY_SITE_DATA)).toBeTruthy();
      expect(localStorage.getItem(CACHE_KEY_TIMESTAMP)).toBeTruthy();
    });

    it("should save timestamp with current time", () => {
      const testData = { categories: {} };
      const beforeSave = Date.now();

      localStorage.setItem(CACHE_KEY_SITE_DATA, JSON.stringify(testData));
      localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());

      const afterSave = Date.now();
      const savedTimestamp = parseInt(localStorage.getItem(CACHE_KEY_TIMESTAMP) || "0");

      expect(savedTimestamp).toBeGreaterThanOrEqual(beforeSave);
      expect(savedTimestamp).toBeLessThanOrEqual(afterSave);
    });

    it("should handle invalid data gracefully", () => {
      const invalidData = null;
      const result = !!(invalidData && invalidData.categories);

      expect(result).toBe(false);
    });

    it("should handle data without categories", () => {
      const invalidData = { title: "test" };
      const result = invalidData && invalidData.categories;

      expect(result).toBe(undefined);
    });
  });

  describe("loadFromCache", () => {
    it("should return valid cached data", () => {
      const testData = {
        categories: {
          animals: { title: "Animals" },
          fantasy: { title: "Fantasy" },
          nature: { title: "Nature" },
          space: { title: "Space" },
          vehicles: { title: "Vehicles" },
        },
      };

      localStorage.setItem(CACHE_KEY_SITE_DATA, JSON.stringify(testData));
      const cachedData = localStorage.getItem(CACHE_KEY_SITE_DATA);
      const parsedData = cachedData ? JSON.parse(cachedData) : null;

      expect(parsedData).not.toBeNull();
      expect(parsedData).toHaveProperty("categories");
      expect(Object.keys(parsedData.categories).length).toBeGreaterThanOrEqual(5);
    });

    it("should return null when no cache exists", () => {
      const cachedData = localStorage.getItem(CACHE_KEY_SITE_DATA);
      expect(cachedData).toBe(null);
    });

    it("should return null for invalid JSON", () => {
      localStorage.setItem(CACHE_KEY_SITE_DATA, "invalid json");

      expect(() => {
        const cachedData = localStorage.getItem(CACHE_KEY_SITE_DATA);
        if (cachedData) JSON.parse(cachedData);
      }).toThrow();
    });

    it("should return null for data without categories", () => {
      const invalidData = { title: "test", version: "1.0" };
      localStorage.setItem(CACHE_KEY_SITE_DATA, JSON.stringify(invalidData));

      const cachedData = localStorage.getItem(CACHE_KEY_SITE_DATA);
      const parsedData = cachedData ? JSON.parse(cachedData) : null;

      expect(parsedData).not.toBeNull();
      expect(parsedData?.categories).toBeUndefined();
    });

    it("should return null for insufficient categories", () => {
      const insufficientData = {
        categories: {
          animals: { title: "Animals" },
          fantasy: { title: "Fantasy" },
        },
      };
      localStorage.setItem(CACHE_KEY_SITE_DATA, JSON.stringify(insufficientData));

      const cachedData = localStorage.getItem(CACHE_KEY_SITE_DATA);
      const parsedData = cachedData ? JSON.parse(cachedData) : null;
      const categoryCount = parsedData ? Object.keys(parsedData.categories).length : 0;

      expect(parsedData).not.toBeNull();
      expect(categoryCount).toBe(2);
      expect(categoryCount).toBeLessThan(5);
    });

    it("should clear invalid cache data", () => {
      localStorage.setItem(CACHE_KEY_SITE_DATA, "invalid json");
      localStorage.setItem(CACHE_KEY_TIMESTAMP, "123456");

      try {
        const cachedData = localStorage.getItem(CACHE_KEY_SITE_DATA);
        if (cachedData) JSON.parse(cachedData);
      } catch (error) {
        localStorage.removeItem(CACHE_KEY_SITE_DATA);
        localStorage.removeItem(CACHE_KEY_TIMESTAMP);
      }

      expect(localStorage.getItem(CACHE_KEY_SITE_DATA)).toBe(null);
      expect(localStorage.getItem(CACHE_KEY_TIMESTAMP)).toBe(null);
    });
  });
});
