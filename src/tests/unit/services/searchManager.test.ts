import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock DOM APIs before importing
vi.stubGlobal("document", {
  getElementById: vi.fn(() => null),
  addEventListener: vi.fn(),
});
vi.stubGlobal("window", {
  ...globalThis.window,
  SearchManager: null,
  addEventListener: vi.fn(),
  location: { hash: "" },
  history: { pushState: vi.fn() },
  showToast: vi.fn(),
});

import searchManager from "../../../services/searchManager.js";

const testCategories = {
  animals: {
    title: "Animal Kingdom",
    name: "Animal Kingdom",
    items: {
      cat: {
        title: "Cute Cat",
        name: "Cute Cat",
        key: "cat",
        description: "A fluffy cat",
        tags: ["pet", "feline"],
      },
      dog: {
        title: "Happy Dog",
        name: "Happy Dog",
        key: "dog",
        description: "A playful dog",
        tags: ["pet", "canine"],
      },
      eagle: {
        title: "Majestic Eagle",
        name: "Majestic Eagle",
        key: "eagle",
        description: "A soaring eagle",
        tags: ["bird", "wildlife"],
      },
    },
  },
  fantasy: {
    title: "Fantasy World",
    name: "Fantasy World",
    items: {
      dragon: {
        title: "Fire Dragon",
        name: "Fire Dragon",
        key: "dragon",
        description: "A fierce dragon",
        tags: ["mythical"],
      },
      unicorn: {
        title: "Rainbow Unicorn",
        name: "Rainbow Unicorn",
        key: "unicorn",
        description: "A magical unicorn",
        tags: ["mythical", "horse"],
      },
    },
  },
};

describe("SearchManager", () => {
  beforeEach(() => {
    searchManager.searchIndex = [];
    searchManager.lastQuery = "";
  });

  it("should build search index from categories", () => {
    searchManager.buildSearchIndex(testCategories);

    expect(searchManager.searchIndex).toHaveLength(5);
    expect(searchManager.searchIndex[0]).toHaveProperty("searchTerms");
    expect(searchManager.searchIndex[0]).toHaveProperty("category");
  });

  it("should find items matching a single search term", () => {
    searchManager.buildSearchIndex(testCategories);

    const results = searchManager.search("cat");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].item.key).toBe("cat");
  });

  it("should find items matching category name", () => {
    searchManager.buildSearchIndex(testCategories);

    const results = searchManager.search("fantasy");
    expect(results.length).toBe(2);
    results.forEach(r => expect(r.category).toBe("fantasy"));
  });

  it("should find items matching tags", () => {
    searchManager.buildSearchIndex(testCategories);

    const results = searchManager.search("pet");
    expect(results.length).toBe(2);
    const keys = results.map(r => r.item.key);
    expect(keys).toContain("cat");
    expect(keys).toContain("dog");
  });

  it("should return empty results for non-matching query", () => {
    searchManager.buildSearchIndex(testCategories);

    const results = searchManager.search("xyznonexistent");
    expect(results).toHaveLength(0);
  });

  it("should handle multi-word search with AND logic", () => {
    searchManager.buildSearchIndex(testCategories);

    // "happy dog" should match only the dog item
    const results = searchManager.search("happy dog");
    expect(results.length).toBe(1);
    expect(results[0].item.key).toBe("dog");
  });

  it("should rank exact name matches higher", () => {
    searchManager.buildSearchIndex(testCategories);

    const results = searchManager.search("eagle");
    expect(results.length).toBeGreaterThanOrEqual(1);
    // The eagle item should be ranked first due to name match
    expect(results[0].item.key).toBe("eagle");
  });

  it("should handle empty categories gracefully", () => {
    const emptyCats = {
      empty: { title: "Empty", items: [] },
    };

    searchManager.buildSearchIndex(emptyCats);
    expect(searchManager.searchIndex).toHaveLength(0);
  });

  it("should handle special characters in search", () => {
    searchManager.buildSearchIndex(testCategories);

    // Should not throw on special regex chars
    const results = searchManager.search("cat (fluffy)");
    expect(results).toBeDefined();
  });

  it("should highlight matching terms in text", () => {
    const result = searchManager.highlightMatch("Cute Cat", "cat");
    expect(result).toContain("<mark");
    expect(result).toContain("Cat");
  });
});
