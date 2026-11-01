import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const source = readFileSync(resolve(__dirname, "../../src/app.js"), "utf8");
const section = (start: string, end: string) =>
  source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

function createLoader(handler?: (prompt: string) => unknown) {
  let itemNumber = 0;
  const original = {
    title: "Animal Kingdom",
    items: {
      animals_item_1: {
        title: "Original Puppy",
        description: "Original image prompt",
        imageUrl: "/existing-image.png",
      },
    },
  };
  const saveToCache = vi.fn();
  const showToast = vi.fn();
  const callAIAPI = vi.fn(async (prompt: string) => {
    if (handler) return await handler(prompt);
    const size = Number(prompt.match(/Create exactly (\d+) unique items/)![1]);
    return {
      items: Object.fromEntries(
        Array.from({ length: size }, (_, index) => [
          `generated_${index}`,
          {
            title: `Generated scene ${++itemNumber}`,
            description: `Black-and-white scene ${itemNumber}`,
          },
        ])
      ),
    };
  });
  const sandbox = {
    WORKER_IMAGE_MODE: false,
    STATIC_MODE: false,
    siteData: { categories: { animals: original } },
    callAIAPI,
    saveToCache,
    showToast,
    CACHE_KEY_SITE_DATA: "site-data",
    CACHE_KEY_TIMESTAMP: "timestamp",
    localStorage: { getItem: vi.fn(), removeItem: vi.fn() },
    getCategoryInfo: (key: string) => ({
      title: key,
      description: `${key} pages`,
      keywords: [key],
    }),
    debug: { log: vi.fn() },
    console: { error: vi.fn(), log: vi.fn(), warn: vi.fn() },
    setTimeout: (callback: () => void) => {
      Promise.resolve().then(callback);
      return 0;
    },
  };
  const api = vm.runInNewContext(
    [
      section("const categoryLoadingState =", "// Generate just the front page data"),
      section("function loadFromCache()", "// Function to get a category icon"),
      section("async function loadCategoriesInBackground()", "// Get category information"),
      section("async function ensureCategoryLoaded(", "// Sample data for fallback"),
      "({ loadSingleCategory, loadCategoriesInBackground, ensureCategoryLoaded, loadFromCache, categoryLoadingState })",
    ].join("\n"),
    sandbox
  );
  return { api, sandbox, original, callAIAPI, saveToCache, showToast };
}

describe("Category expansion", () => {
  it("reaches the 160-item target using bounded batches without replacing existing pages", async () => {
    const { api, sandbox, original, callAIAPI, saveToCache } = createLoader();
    const result = await api.loadSingleCategory("animals");

    expect(Object.keys(result.items)).toHaveLength(160);
    expect(result.items.animals_item_1).toEqual(original.items.animals_item_1);
    expect(callAIAPI).toHaveBeenCalledTimes(14);
    const sizes = callAIAPI.mock.calls.map(([prompt]) =>
      Number(prompt.match(/Create exactly (\d+) unique items/)![1])
    );
    expect(Math.max(...sizes)).toBe(12);
    expect(sizes.at(-1)).toBe(3);
    expect(sandbox.siteData.categories.animals).toBe(result);
    expect(api.categoryLoadingState.loadedCategories.has("animals")).toBe(true);
    expect(saveToCache).toHaveBeenCalledTimes(1);
    expect(saveToCache.mock.calls[0][0].expandedCategories).toEqual(["animals"]);
  });

  it("propagates provider errors and keeps failed categories retryable and uncached", async () => {
    const error = new Error("Provider timed out");
    const { api, sandbox, original, callAIAPI, saveToCache } = createLoader(() => {
      throw error;
    });
    await expect(api.loadSingleCategory("animals")).rejects.toBe(error);
    await expect(api.loadSingleCategory("animals")).rejects.toBe(error);
    expect(callAIAPI).toHaveBeenCalledTimes(2);
    expect(sandbox.siteData.categories.animals).toBe(original);
    expect(api.categoryLoadingState.loadedCategories.size).toBe(0);
    expect(api.categoryLoadingState.loadingPromises.size).toBe(0);
    expect(saveToCache).not.toHaveBeenCalled();
  });

  it.each([
    { items: [] },
    { items: {} },
    {
      items: Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => [i, { title: "Duplicate", description: "Prompt" }])
      ),
    },
    {
      items: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i, { title: `Title ${i}` }])),
    },
  ])(
    "rejects invalid expansion content instead of marking fallback data loaded",
    async response => {
      const { api, sandbox, original, saveToCache } = createLoader(() => response);
      await expect(api.loadSingleCategory("animals")).rejects.toThrow("Invalid animals expansion");
      expect(sandbox.siteData.categories.animals).toBe(original);
      expect(api.categoryLoadingState.loadedCategories.size).toBe(0);
      expect(saveToCache).not.toHaveBeenCalled();
    }
  );

  it("does not persist incomplete batches when a later generation fails", async () => {
    const { api, sandbox, original, callAIAPI, saveToCache } = createLoader();
    callAIAPI.mockImplementationOnce(async () => ({
      items: Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => [
          i,
          { title: `New scene ${i}`, description: "New line-art scene" },
        ])
      ),
    }));
    callAIAPI.mockRejectedValueOnce(new Error("Second batch timed out"));
    await expect(api.loadSingleCategory("animals")).rejects.toThrow("Second batch timed out");
    expect(sandbox.siteData.categories.animals).toBe(original);
    expect(saveToCache).not.toHaveBeenCalled();
    expect(api.categoryLoadingState.loadedCategories.size).toBe(0);
  });

  it("reports partial background failure accurately and caches only successful expansions", async () => {
    const { api, callAIAPI, saveToCache, showToast } = createLoader();
    const generate = callAIAPI.getMockImplementation()!;
    callAIAPI.mockImplementation(async prompt => {
      if (prompt.includes('for "fantasy"')) throw new Error("Fantasy unavailable");
      return generate(prompt);
    });
    const result = await api.loadCategoriesInBackground();
    expect(result).toEqual({
      loadedCount: 24,
      totalCategories: 25,
      failedCategories: ["fantasy"],
    });
    expect(api.categoryLoadingState.isComplete).toBe(false);
    expect(api.categoryLoadingState.frontPageDataOnly).toBe(false);
    expect(api.categoryLoadingState.loadedCategories.has("fantasy")).toBe(false);
    expect(saveToCache).toHaveBeenCalledTimes(24);
    expect(saveToCache.mock.calls.at(-1)![0].expandedCategories).not.toContain("fantasy");
    expect(showToast.mock.calls.at(-1)![0]).toContain("Loaded 24/25 categories. 1 failed");
    expect(showToast.mock.calls.at(-1)![1]).toBe("warning");
  });

  it("does not claim completion or cache when every category fails", async () => {
    const { api, saveToCache, showToast } = createLoader(() => {
      throw new Error("All providers unavailable");
    });
    const result = await api.loadCategoriesInBackground();
    expect(result.loadedCount).toBe(0);
    expect(result.failedCategories).toHaveLength(25);
    expect(api.categoryLoadingState.isComplete).toBe(false);
    expect(api.categoryLoadingState.frontPageDataOnly).toBe(true);
    expect(saveToCache).not.toHaveBeenCalled();
    expect(showToast.mock.calls.at(-1)![0]).toContain("Loaded 0/25 categories. 25 failed");
    expect(showToast.mock.calls.some(([, type]) => type === "success")).toBe(false);
  });

  it("reports complete success only after every category reaches its target", async () => {
    const { api, sandbox, showToast } = createLoader();
    const result = await api.loadCategoriesInBackground();
    expect(result.loadedCount).toBe(25);
    expect(result.failedCategories).toEqual([]);
    expect(api.categoryLoadingState.isComplete).toBe(true);
    expect(
      Object.values(sandbox.siteData.categories).every(
        category => Object.keys(category.items).length === 160
      )
    ).toBe(true);
    expect(showToast.mock.calls.at(-1)).toEqual([
      "All categories loaded successfully!",
      "success",
      3000,
    ]);
  });

  it("restores only successfully completed expansions from cache", async () => {
    const { api, sandbox, original } = createLoader();
    const complete = await api.loadSingleCategory("animals");
    sandbox.localStorage.getItem.mockReturnValue(
      JSON.stringify({
        categories: {
          animals: complete,
          fantasy: original,
          nature: original,
          space: original,
          food: original,
        },
        expandedCategories: ["animals", "fantasy", "missing"],
      })
    );
    expect(api.loadFromCache()).not.toBeNull();
    expect([...api.categoryLoadingState.loadedCategories]).toEqual(["animals"]);
  });

  it("keeps existing pages visible and warns when a background upgrade fails", async () => {
    const { api, original, showToast } = createLoader(() => {
      throw new Error("Generation failed");
    });
    expect(await api.ensureCategoryLoaded("animals")).toBe(original);
    await vi.waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("Existing pages are still available"),
        "warning",
        5000
      );
    });
    expect(api.categoryLoadingState.loadedCategories.has("animals")).toBe(false);
  });

  it("deduplicates concurrent category expansion requests", async () => {
    const { api, callAIAPI, saveToCache } = createLoader();
    const [first, second] = await Promise.all([
      api.loadSingleCategory("animals"),
      api.loadSingleCategory("animals"),
    ]);
    expect(first).toBe(second);
    expect(callAIAPI).toHaveBeenCalledTimes(14);
    expect(saveToCache).toHaveBeenCalledTimes(1);
  });

  it("returns existing pages immediately while a provider expansion remains pending", async () => {
    const { api, original } = createLoader(() => new Promise(() => {}));
    const existing = await api.ensureCategoryLoaded("animals");
    expect(existing).toBe(original);
    expect(api.categoryLoadingState.loadingPromises.has("animals")).toBe(true);
  });

  it.each(["WORKER_IMAGE_MODE", "STATIC_MODE"])(
    "never gates catalog navigation on generation in %s",
    async mode => {
      const { api, sandbox, original, callAIAPI } = createLoader(() => new Promise(() => {}));
      sandbox[mode as "WORKER_IMAGE_MODE" | "STATIC_MODE"] = true;
      expect(await api.ensureCategoryLoaded("animals")).toBe(original);
      original.items = {};
      expect(await api.ensureCategoryLoaded("animals")).toBe(original);
      expect(callAIAPI).not.toHaveBeenCalled();
      expect(api.categoryLoadingState.loadingPromises.size).toBe(0);
    }
  );
});
