/**
 * Unit tests for the content-api worker's GET /catalog route.
 *
 * These tests mock the KV namespace and global fetch, then call the worker's
 * fetch handler directly. They intentionally do NOT use
 * @cloudflare/vitest-pool-workers (not in devDependencies) — the route logic
 * is pure enough that a plain vitest + jsdom environment is sufficient. If
 * you later add @cloudflare/vitest-pool-workers, move these to a
 * miniflare-backed pool for full CF runtime fidelity, but the mocks here
 * cover the cache/lock/rate-limit/kill-switch decision tree.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import worker from "../src/index.js";
import { stringToHash } from "../../shared/utils.js";
import { CATEGORY_KEYS } from "../../shared/constants.js";

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

/** In-memory KV namespace mock with TTL awareness for get/put/delete. */
function makeKV(initial = {}) {
  const store = new Map(Object.entries(initial));
  const now = () => Date.now();
  return {
    store,
    get: vi.fn(async key => {
      if (!store.has(key)) return null;
      const entry = store.get(key);
      if (entry.expiresAt !== undefined && entry.expiresAt < now()) {
        store.delete(key);
        return null;
      }
      return entry.value;
    }),
    put: vi.fn(async (key, value, opts = {}) => {
      store.set(key, {
        value,
        expiresAt: opts.expirationTtl ? now() + opts.expirationTtl * 1000 : undefined,
      });
    }),
    delete: vi.fn(async key => {
      store.delete(key);
    }),
    resetMockCalls: () => {
      vi.clearAllMocks();
    },
  };
}

/** Default env for /catalog tests. */
function makeEnv(overrides = {}) {
  return {
    ALLOWED_ORIGINS: "https://dseeker.github.io",
    POLLINATIONS_API_KEY: "test-key",
    CATALOG_CATEGORY_DELAY_MS: "0", // no inter-category sleeps in tests
    ...overrides,
  };
}

function makeCtx() {
  const jobs = [];
  return {
    jobs,
    waitUntil: vi.fn(job => jobs.push(job)),
    flush: async () => {
      const ps = jobs.splice(0).map(j => (j instanceof Promise ? j : Promise.resolve(j)));
      await Promise.allSettled(ps);
    },
  };
}

function makeRequest(path, headers = {}) {
  return new Request(`https://colorverse-content-api.test${path}`, {
    method: "GET",
    headers,
  });
}

/** Build a valid cached catalog payload. */
function makeCatalog(generatedAt = Date.now()) {
  return {
    brand: { name: "ColorVerse", tagline: "Personalized Coloring Pages Made Just for You" },
    seasonal_gallery: {
      title: "Winter Collection",
      subtitle: "Seasonal coloring pages",
      items: {},
    },
    categories: {
      animals: {
        title: "Animal Kingdom",
        description: "Discover the wonderful world of animals.",
        keywords: ["animals"],
        items: {
          animals_item_1: { title: "A", description: "a" },
          animals_item_2: { title: "B", description: "b" },
        },
      },
    },
    _meta: {
      generatedAt,
      totalItems: 2,
      categoryCount: 1,
      season: "winter",
      style: "classic",
      seed: null,
      generatedBy: "anonymous",
    },
  };
}

/** LLM JSON payload for one category (what callPollinations returns). */
function llmCategoryResponse(categoryKey, itemCount = 1) {
  const items = {};
  for (let i = 1; i <= itemCount; i++) {
    items[`${categoryKey}_item_${i}`] = {
      title: `${categoryKey} title ${i}`,
      description: `${categoryKey} description ${i}`,
    };
  }
  return {
    title: `${categoryKey} title`,
    description: `${categoryKey} description`,
    keywords: [categoryKey],
    items,
  };
}

function llmChatBody(content) {
  return {
    choices: [{ message: { content: JSON.stringify(content) } }],
  };
}

/**
 * Wire a mocked global fetch that answers Pollinations chat-completions
 * calls. Default: every category returns a valid 1-item payload; the
 * seasonal prompt (detectable by "seasonal coloring page items") returns a
 * 12-item seasonal payload. Returns the fetch mock for per-test overrides.
 */
function mockFetchDefault() {
  const fetchMock = vi.fn(async (url, opts) => {
    const body = JSON.parse(opts.body);
    const userPrompt = body.messages.find(m => m.role === "user").content;
    const seasonal = userPrompt.includes("seasonal coloring page items");
    const catKey = userPrompt.match(/for the "([^"]+)" category/)?.[1] || "unknown";
    const payload = seasonal
      ? {
          title: "Winter Collection",
          subtitle: "Seasonal coloring pages",
          items: Object.fromEntries(
            Array.from({ length: 12 }, (_, i) => [
              `seasonal_${i + 1}`,
              { title: `s${i + 1}`, description: `s${i + 1}` },
            ])
          ),
        }
      : llmCategoryResponse(catKey);
    return new Response(JSON.stringify(llmChatBody(payload)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /catalog", () => {
  let kv;
  let env;
  let ctx;
  let fetchMock;

  beforeEach(() => {
    kv = makeKV();
    env = makeEnv({ SITE_DATA: kv });
    ctx = makeCtx();
    fetchMock = mockFetchDefault();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("1. KV hit + fresh: 200, Cache-Control max-age=86400, zero fetch calls", async () => {
    const catalog = makeCatalog(Date.now() - 60 * 60 * 1000); // 1h old < 24h
    await kv.put("catalog:default", JSON.stringify(catalog));

    const res = await worker.fetch(makeRequest("/catalog"), env, ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
    expect(body._meta.totalItems).toBe(2);
    expect(fetchMock).not.toHaveBeenCalled();
    // Fresh hit must not touch the generation lock or schedule anything.
    expect(ctx.waitUntil).not.toHaveBeenCalled();
  });

  it("2. KV hit + stale: returns stale body immediately AND regenerates in background", async () => {
    const staleCatalog = makeCatalog(Date.now() - 25 * 60 * 60 * 1000); // 25h old
    staleCatalog._meta.staleMarker = true;
    await kv.put("catalog:default", JSON.stringify(staleCatalog));

    const res = await worker.fetch(makeRequest("/catalog"), env, ctx);
    const body = await res.json();

    // Stale body served (with a short max-age to force revalidation).
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect(body._meta.staleMarker).toBe(true);

    // waitUntil was scheduled with a generation job.
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
    await ctx.flush();

    // After background completion: catalog rewritten (fresh, no marker),
    // lock released, and LLM calls were made.
    const freshRaw = await kv.get("catalog:default");
    const fresh = JSON.parse(freshRaw);
    expect(fresh._meta.staleMarker).toBeUndefined();
    expect(fresh._meta.generatedAt).toBeGreaterThan(staleCatalog._meta.generatedAt);
    expect(fresh._meta.categoryCount).toBe(25);
    expect(await kv.get("catalog:generating:catalog:default")).toBeNull();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("3. KV miss: 202 + Retry-After: 10, then background generation fills KV", async () => {
    const res = await worker.fetch(makeRequest("/catalog"), env, ctx);
    const body = await res.json();

    expect(res.status).toBe(202);
    expect(res.headers.get("Retry-After")).toBe("10");
    expect(body.status).toBe("generating");
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);

    // While the background job runs, the generation lock must be held.
    expect(await kv.get("catalog:generating:catalog:default")).toBe("1");

    await ctx.flush();
    const generated = JSON.parse(await kv.get("catalog:default"));
    expect(generated.categories).toBeDefined();
    expect(Object.keys(generated.categories)).toHaveLength(25);
    expect(generated._meta.categoryCount).toBe(25);
    expect(generated.seasonal_gallery.items).toBeDefined();
    expect(Object.keys(generated.seasonal_gallery.items)).toHaveLength(12);
    expect(await kv.get("catalog:generating:catalog:default")).toBeNull();
  });

  it("4. X-ColorVerse-UID header does NOT change the KV key (same params = same key)", async () => {
    const catalog = makeCatalog(Date.now());
    await kv.put("catalog:default", JSON.stringify(catalog));

    const resA = await worker.fetch(
      makeRequest("/catalog", { "X-ColorVerse-UID": "aaa" }),
      env,
      ctx
    );
    const resB = await worker.fetch(
      makeRequest("/catalog", { "X-ColorVerse-UID": "bbb" }),
      env,
      ctx
    );
    const resC = await worker.fetch(makeRequest("/catalog"), env, ctx);

    // All three requests hit the same cache entry (200, no 202 generation).
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(resC.status).toBe(200);
    // Only "catalog:default" was ever read for these requests.
    const readKeys = kv.get.mock.calls.map(c => c[0]);
    expect(new Set(readKeys)).toEqual(new Set(["catalog:default"]));
  });

  it("5. Different style/seed produces a different catalog key", async () => {
    const fetchCount1 = () => fetchMock.mock.calls.length;

    // style=bold-simple&seed=1 → hashed key
    const res1 = await worker.fetch(makeRequest("/catalog?style=bold-simple&seed=1"), env, ctx);
    const res2 = await worker.fetch(makeRequest("/catalog?style=intricate&seed=2"), env, ctx);
    const res3 = await worker.fetch(makeRequest("/catalog"), env, ctx);

    expect(res1.status).toBe(202);
    expect(res2.status).toBe(202);
    expect(res3.status).toBe(202);

    const key1 = `catalog:${stringToHash("bold-simple|1")}`;
    const key2 = `catalog:${stringToHash("intricate|2")}`;
    const key3 = "catalog:default";
    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key2).not.toBe(key3);

    // Each param-set gets its own generation job (3 waitUntil calls) and its
    // own lock key is held while generation runs.
    expect(ctx.waitUntil).toHaveBeenCalledTimes(3);
    expect(await kv.get(`catalog:generating:${key1}`)).toBe("1");
    expect(await kv.get(`catalog:generating:${key2}`)).toBe("1");
    expect(await kv.get(`catalog:generating:${key3}`)).toBe("1");
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(fetchCount1());

    // A known style bakes its prompt suffix into the LLM SYSTEM message so
    // generated descriptions are tuned to that style. Three background jobs
    // interleave, so scan all calls: the styled jobs must carry STYLE
    // OVERRIDE with their style's suffix; the default job must not.
    const systemMessages = fetchMock.mock.calls.map(
      call => JSON.parse(call[1].body).messages[0].content
    );
    expect(systemMessages.some(msg => msg.includes("bold thick outlines"))).toBe(true);
    expect(systemMessages.some(msg => msg.includes("highly detailed line art"))).toBe(true);
    expect(systemMessages.some(msg => !msg.includes("STYLE OVERRIDE"))).toBe(true);
  });

  it("6. Generation lock: second concurrent request gets 202 without triggering generation", async () => {
    // Seed the lock as if another request is mid-generation.
    await kv.put("catalog:generating:catalog:default", "1", { expirationTtl: 120 });

    const putCallsBefore = kv.put.mock.calls.length;
    const res = await worker.fetch(makeRequest("/catalog"), env, ctx);
    const body = await res.json();

    expect(res.status).toBe(202);
    expect(res.headers.get("Retry-After")).toBe("10");
    expect(body.status).toBe("generating");
    // No background job was scheduled and no new lock was written.
    expect(ctx.waitUntil).not.toHaveBeenCalled();
    expect(kv.put.mock.calls.length).toBe(putCallsBefore);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("7. DISABLE_WORKER_GEN kill switch serves the legacy site-data.json key", async () => {
    const legacy = makeCatalog();
    legacy._meta.legacy = true;
    await kv.put("site-data.json", JSON.stringify(legacy));

    const killEnv = makeEnv({ SITE_DATA: kv, DISABLE_WORKER_GEN: "true" });
    const res = await worker.fetch(makeRequest("/catalog"), killEnv, ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
    expect(body._meta.legacy).toBe(true);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://dseeker.github.io");
    // Kill switch must never generate or touch catalog:* keys.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ctx.waitUntil).not.toHaveBeenCalled();
    const readKeys = kv.get.mock.calls.map(c => c[0]);
    expect(readKeys).toContain("site-data.json");
    expect(readKeys.some(k => k.startsWith("catalog:"))).toBe(false);
  });

  it("7b. DISABLE_WORKER_GEN with missing legacy key → 404", async () => {
    const killEnv = makeEnv({ SITE_DATA: kv, DISABLE_WORKER_GEN: "true" });
    const res = await worker.fetch(makeRequest("/catalog"), killEnv, ctx);
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.error).toMatch(/site-data\.json/);
  });

  it("8. No SITE_DATA binding → 503 'KV not configured'", async () => {
    const noKvEnv = makeEnv();
    delete noKvEnv.SITE_DATA;

    const res = await worker.fetch(makeRequest("/catalog"), noKvEnv, ctx);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe("KV not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Hybrid/resilient generation tests
  // ---------------------------------------------------------------------------

  it("9. Parallel generation — all succeed", async () => {
    const res = await worker.fetch(makeRequest("/catalog"), env, ctx);
    expect(res.status).toBe(202);

    await ctx.flush();

    const raw = await kv.get("catalog:default");
    const cat = JSON.parse(raw);
    expect(cat.categories).toBeDefined();
    expect(Object.keys(cat.categories)).toHaveLength(25);
    expect(Object.keys(cat.seasonal_gallery.items)).toHaveLength(12);
    // countCatalogItems only counts categories, not seasonal.
    expect(cat._meta.totalItems).toBe(25); // 25 * 1 item per category
    expect(cat._meta.categoryCount).toBe(25);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("10. Parallel generation — partial failures (non-402)", async () => {
    // Make 13 categories fail with a generic error, 13 succeed.
    const failKeys = new Set(CATEGORY_KEYS.slice(0, 13));
    const customFetch = vi.fn(async (url, opts) => {
      const body = JSON.parse(opts.body);
      const userPrompt = body.messages.find(m => m.role === "user").content;
      const catKey = userPrompt.match(/for the "([^"]+)" category/)?.[1] || "unknown";
      if (catKey === "__seasonal__" || userPrompt.includes("seasonal coloring page items")) {
        return new Response(JSON.stringify(llmChatBody(llmCategoryResponse("seasonal"))), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (failKeys.has(catKey)) {
        return new Response(JSON.stringify({ error: "boom" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(llmChatBody(llmCategoryResponse(catKey))), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", customFetch);

    const res = await worker.fetch(makeRequest("/catalog"), env, ctx);
    expect(res.status).toBe(202);

    await ctx.flush();

    const raw = await kv.get("catalog:default");
    const cat = JSON.parse(raw);
    expect(cat.categories).toBeDefined();
    expect(Object.keys(cat.categories)).toHaveLength(25);
    // All 25 keys exist (13 real + 13 fallback, but 26 keys total so 25+seasonal)
    // Note: 13 failed categories get fallback { items: {} }, 12 succeed with real items.
    // + seasonal.
    expect(cat._meta.categoryCount).toBe(25);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("11. Parallel generation — 402 on ≥50%", async () => {
    // Make 14+ calls reject with 402 from ALL providers (Pollinations +
    // OpenRouter + Gemini all return 402, so the chain exhausts with 402).
    const cat402Set = new Set(CATEGORY_KEYS.slice(0, 14));
    const customFetch = vi.fn(async (url, opts) => {
      const urlString = String(url);
      const isPollinations = urlString.includes("pollinations");
      let userPrompt = "";
      if (opts && opts.body) {
        const body = JSON.parse(opts.body);
        if (body.messages) {
          userPrompt = (body.messages.find(m => m.role === "user") || {}).content || "";
        } else if (body.contents) {
          userPrompt = (body.contents[0]?.parts || []).map((p: any) => p.text || "").join(" ");
        }
      }
      const catKey =
        userPrompt.match(/for the "([^"]+)" category/)?.[1] ||
        (userPrompt.includes("seasonal") ? "__seasonal__" : "unknown");

      // Seasonal always succeeds (on Pollinations).
      if (
        (catKey === "__seasonal__" || userPrompt.includes("seasonal coloring page items")) &&
        isPollinations
      ) {
        return new Response(JSON.stringify(llmChatBody({ items: {} })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      // 14 categories get 402 from every provider — the body text contains
      // the category name, so check against the raw body string too.
      const bodyStr = opts && opts.body ? String(opts.body) : "";
      const is402Cat =
        cat402Set.has(catKey) || [...cat402Set].some(k => bodyStr.includes(`"${k}"`));
      if (is402Cat) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Non-402 categories succeed.
      return new Response(JSON.stringify(llmChatBody(llmCategoryResponse(catKey))), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", customFetch);

    // Provide all three keys so the chain tries all providers.
    const env402 = makeEnv({
      SITE_DATA: kv,
      OPENROUTER_API_KEY: "test-or-key",
      GOOGLE_GEMINI_API_KEY: "test-gem-key",
    });

    const res = await worker.fetch(makeRequest("/catalog"), env402, ctx);
    expect(res.status).toBe(202);

    await ctx.flush();

    // Catalog should NOT be written (≥50% 402).
    const raw = await kv.get("catalog:default");
    expect(raw).toBeNull();
    // Lock should be kept (keepLock=true on ≥50% 402).
    expect(await kv.get("catalog:generating:catalog:default")).toBe("1");
    // Failcount should be incremented.
    const fc = await kv.get("catalog:failcount:catalog:default");
    expect(fc).toBe("1");

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("12. Chain mode — fresh start (deadline=0 forces chain)", async () => {
    // deadline=0 means makeDeadline hits expired() immediately.
    // The parallel batch loop breaks at the first deadline check, writing nothing.
    // The orchestrator sees keepLock=false + deadline.expired() → starts chain mode.
    // In chain mode, it generates CATALOG_CHAIN_BATCH_SIZE (5) categories.
    const chainEnv = makeEnv({
      SITE_DATA: kv,
      CATALOG_GEN_DEADLINE_MS: "0",
      CATALOG_CHAIN_BATCH_SIZE: "5",
    });
    const chainCtx = makeCtx();
    const chainFetch = mockFetchDefault();

    const res = await worker.fetch(makeRequest("/catalog"), chainEnv, chainCtx);
    expect(res.status).toBe(202);

    // Wait for the background job to run.
    await chainCtx.flush();

    // Check that a partial was written (chain mode saved progress).
    const partialRaw = await kv.get("catalog:partial:catalog:default");
    expect(partialRaw).not.toBeNull();
    const partial = JSON.parse(partialRaw);
    expect(partial.completedKeys.length).toBe(5);
    expect(partial.remainingKeys.length).toBe(20);

    // Reset KV and fetch mocks for next test.
    kv.store.clear();
    await kv.put("catalog:default", JSON.stringify(makeCatalog(Date.now())));
    kv.resetMockCalls();

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("13. Chain mode — resume from existing partial", async () => {
    // Pre-seed a partial with 5 categories completed (first 5 keys).
    const preSeeded = {
      categories: {},
      completedKeys: CATEGORY_KEYS.slice(0, 5), // 5 done
      remainingKeys: CATEGORY_KEYS.slice(5), // 20 remaining
      seasonalDone: false,
      startedAt: Date.now() - 60_000,
      styleKey: "",
      seed: "",
    };
    await kv.put("catalog:partial:catalog:default", JSON.stringify(preSeeded), {
      expirationTtl: 300,
    });

    // Pre-set the lock so handleCatalog sees lock-held + partial.
    await kv.put("catalog:generating:catalog:default", "1", { expirationTtl: 300 });

    const res = await worker.fetch(makeRequest("/catalog"), env, ctx);
    expect(res.status).toBe(202);

    // handleCatalog schedules a chain continuation in waitUntil.
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
    await ctx.flush();

    // Partial should have 10 completed (5 pre-seeded + 5 from this batch).
    const partialRaw = await kv.get("catalog:partial:catalog:default");
    expect(partialRaw).not.toBeNull();
    const partial = JSON.parse(partialRaw);
    expect(partial.completedKeys.length).toBe(10);

    // Lock should be released (chain writes partial, doesn't keep lock).
    expect(await kv.get("catalog:generating:catalog:default")).toBeNull();
  });

  it("14. Chain mode — stale partial discarded", async () => {
    // Pre-seed a stale partial (started 11 min ago).
    const stalePartial = {
      categories: {},
      completedKeys: [],
      remainingKeys: [...CATEGORY_KEYS],
      seasonalDone: false,
      startedAt: Date.now() - 660_000, // 11 minutes ago
      styleKey: "",
      seed: "",
    };
    await kv.put("catalog:partial:catalog:default", JSON.stringify(stalePartial), {
      expirationTtl: 300,
    });

    const staleRes = await worker.fetch(makeRequest("/catalog"), env, ctx);
    expect(staleRes.status).toBe(202);
    await ctx.flush();

    // Partial should be gone (discarded), and a fresh catalog should be in KV.
    const afterPartial = await kv.get("catalog:partial:catalog:default");
    expect(afterPartial).toBeNull();

    const catRaw = await kv.get("catalog:default");
    const cat = JSON.parse(catRaw);
    expect(cat.categories).toBeDefined();
    expect(Object.keys(cat.categories)).toHaveLength(25);

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("15. Failcount ≥ 3 serves legacy site-data.json", async () => {
    // Pre-seed failcount = 3.
    await kv.put("catalog:failcount:catalog:default", "3");

    // Also pre-seed legacy data.
    const legacy = makeCatalog();
    legacy._meta.legacy = true;
    await kv.put("site-data.json", JSON.stringify(legacy));

    const res = await worker.fetch(makeRequest("/catalog"), env, ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
    expect(body._meta.legacy).toBe(true);
    // No generation should be scheduled.
    expect(ctx.waitUntil).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("16. Failcount resets on success", async () => {
    // Pre-seed failcount = 2.
    await kv.put("catalog:failcount:catalog:default", "2");

    const res = await worker.fetch(makeRequest("/catalog"), env, ctx);
    expect(res.status).toBe(202);
    await ctx.flush();

    // Failcount should be deleted after successful generation.
    const fc = await kv.get("catalog:failcount:catalog:default");
    expect(fc).toBeNull();
  });

  it("17. Rate limit (429) returns dynamic Retry-After and X-RateLimit headers", async () => {
    // Pre-seed the hourly rate limit to the maximum (5).
    const hourBucket = Math.floor(Date.now() / 3600000);
    await kv.put(`ratelimit:192.168.1.1:${hourBucket}`, "5");

    const res = await worker.fetch(
      makeRequest("/catalog", { "CF-Connecting-IP": "192.168.1.1" }),
      env,
      ctx
    );

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/Too many catalog generation requests/i);

    // Dynamic Retry-After should be 3600/5=720, clamped to max 600
    expect(res.headers.get("Retry-After")).toBe("600");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    // X-RateLimit-Reset should be the Unix timestamp of the next hour boundary
    const resetHeader = res.headers.get("X-RateLimit-Reset");
    expect(resetHeader).toBeTruthy();
    const resetUnix = parseInt(resetHeader!, 10);
    const expectedEnd = (hourBucket * 3600 + 3600) * 1000;
    const expectedReset = Math.ceil(expectedEnd / 1000);
    expect(resetUnix).toBe(expectedReset);

    // No background generation should be scheduled.
    expect(ctx.waitUntil).not.toHaveBeenCalled();
  });
});
