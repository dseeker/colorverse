import { describe, it, expect, beforeEach, vi } from "vitest";

// We need to mock DOM APIs before importing
vi.stubGlobal("document", {
  getElementById: vi.fn(() => null),
  addEventListener: vi.fn(),
});

// Import the module - it exports a singleton, so we'll test the class behavior
// by accessing it and resetting state between tests
import favoritesManager from "../../../services/favoritesManager.js";

describe("FavoritesManager", () => {
  const testItem = { key: "cat-1", name: "Cute Cat" };
  const testCategory = "animals";
  const testImageUrl = "https://example.com/cat.jpg";

  beforeEach(() => {
    // Reset internal state
    favoritesManager.favorites = [];
    favoritesManager.listeners = [];
    localStorage.clear();
  });

  it("should add a favorite", () => {
    const result = favoritesManager.addFavorite(testCategory, testItem, testImageUrl);

    expect(result).toBe(true);
    expect(favoritesManager.getCount()).toBe(1);
    expect(favoritesManager.isFavorite(testCategory, testItem.key)).toBe(true);
  });

  it("should not add duplicate favorites", () => {
    favoritesManager.addFavorite(testCategory, testItem, testImageUrl);
    const result = favoritesManager.addFavorite(testCategory, testItem, testImageUrl);

    expect(result).toBe(false);
    expect(favoritesManager.getCount()).toBe(1);
  });

  it("should remove a favorite", () => {
    favoritesManager.addFavorite(testCategory, testItem, testImageUrl);
    const result = favoritesManager.removeFavorite(testCategory, testItem.key);

    expect(result).toBe(true);
    expect(favoritesManager.getCount()).toBe(0);
    expect(favoritesManager.isFavorite(testCategory, testItem.key)).toBe(false);
  });

  it("should return false when removing non-existent favorite", () => {
    const result = favoritesManager.removeFavorite(testCategory, "nonexistent");
    expect(result).toBe(false);
  });

  it("should return all favorites as a copy", () => {
    favoritesManager.addFavorite(testCategory, testItem, testImageUrl);
    const favorites = favoritesManager.getFavorites();

    expect(favorites).toHaveLength(1);
    expect(favorites[0].id).toBe(`${testCategory}-${testItem.key}`);
    expect(favorites[0].category).toBe(testCategory);
    expect(favorites[0].item).toEqual(testItem);
    expect(favorites[0].imageUrl).toBe(testImageUrl);

    // Should be a copy, not a reference
    favorites.push({ id: "fake" });
    expect(favoritesManager.getCount()).toBe(1);
  });

  it("should persist favorites to localStorage", () => {
    favoritesManager.addFavorite(testCategory, testItem, testImageUrl);

    const stored = localStorage.getItem("colorverse_favorites");
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(`${testCategory}-${testItem.key}`);
  });

  it("should load favorites from localStorage", () => {
    const savedFavorites = [
      {
        id: "animals-dog-1",
        category: "animals",
        item: { key: "dog-1", name: "Happy Dog" },
        imageUrl: "https://example.com/dog.jpg",
        addedAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem("colorverse_favorites", JSON.stringify(savedFavorites));

    const loaded = favoritesManager.loadFavorites();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("animals-dog-1");
  });

  it("should clear all favorites", () => {
    favoritesManager.addFavorite(testCategory, testItem, testImageUrl);
    favoritesManager.addFavorite("fantasy", { key: "dragon-1", name: "Dragon" }, "");

    expect(favoritesManager.getCount()).toBe(2);

    favoritesManager.clearFavorites();

    expect(favoritesManager.getCount()).toBe(0);
    expect(favoritesManager.getFavorites()).toEqual([]);
  });

  it("should notify subscribers on changes", () => {
    const listener = vi.fn();
    favoritesManager.subscribe(listener);

    favoritesManager.addFavorite(testCategory, testItem, testImageUrl);

    expect(listener).toHaveBeenCalledWith(favoritesManager.favorites);
  });

  it("should unsubscribe listeners", () => {
    const listener = vi.fn();
    const unsubscribe = favoritesManager.subscribe(listener);

    unsubscribe();
    favoritesManager.addFavorite(testCategory, testItem, testImageUrl);

    expect(listener).not.toHaveBeenCalled();
  });
});
