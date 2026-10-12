import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import worker from "../src/index.js";
import { stringToHash } from "../../shared/utils.js";

const BASE = "https://image-proxy.example.com";
const TOKEN = "test-cron-token";

/* ---- helpers ---- */

function makeEdgeCache() {
  const store = new Map<string, Response>();
  return {
    store,
    async match(request: Request) {
      return store.has(request.url) ? store.get(request.url)!.clone() : undefined;
    },
    async put(request: Request, response: Response) {
      store.set(request.url, response.clone());
    },
  };
}

function makeKV() {
  const store = new Map<string, ArrayBuffer>();
  const state = {
    failGet: false,
    getCalls: [] as string[],
    putCalls: [] as string[],
    deleteCalls: [] as string[],
  };
  const kv = {
    store,
    state,
    async get(key: string, _opts?: { type?: string }) {
      state.getCalls.push(key);
      if (state.failGet) throw new Error("KV read error (injected)");
      return store.get(key);
    },
    async put(key: string, value: ArrayBuffer) {
      state.putCalls.push(key);
      store.set(key, value);
    },
    async list(opts: { prefix?: string } = {}) {
      const keys = [...store.keys()]
        .filter(k => (opts.prefix ? k.startsWith(opts.prefix) : true))
        .map(name => ({ name }));
      return { keys, list_complete: true };
    },
    async delete(key: string) {
      state.deleteCalls.push(key);
      store.delete(key);
    },
  };
  return kv;
}

function makeCtx() {
  const jobs: Promise<unknown>[] = [];
  return {
    jobs,
    waitUntil(promise: Promise<unknown>) {
      jobs.push(promise);
    },
    async flush() {
      await Promise.all(jobs.splice(0, jobs.length));
    },
  };
}

function makeAIBindSuccess() {
  const run = vi.fn().mockResolvedValue({
    image:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  });
  return { run };
}

function makeAIBindFail() {
  const run = vi.fn().mockResolvedValue(null);
  return { run };
}

function baseEnv(overrides: Record<string, unknown> = {}) {
  return {
    POLLINATIONS_API_KEY: "test-key",
    ALLOWED_ORIGINS: "*",
    AI: null,
    ...overrides,
  };
}

function imageRequest(params: Record<string, string>) {
  const url = new URL("/image", BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
}

/**
 * Stubs fetch with the given status / content-type and returns the mock.
 * The mock records its calls in fetchMock.calls.
 */
function stubFetch(
  status = 200,
  contentType = "image/jpeg"
): { mock: ReturnType<typeof vi.fn>; contentType: string } {
  const body = new Uint8Array([1, 2, 3, 4]);
  const mock = vi.fn(
    async () =>
      new Response(status === 200 ? body : new Uint8Array(), {
        status,
        headers: status === 200 ? { "Content-Type": contentType } : {},
      })
  );
  vi.stubGlobal("fetch", mock);
  return { mock, contentType };
}

let edgeCache: ReturnType<typeof makeEdgeCache>;
let ctx: ReturnType<typeof makeCtx>;

beforeEach(() => {
  edgeCache = makeEdgeCache();
  ctx = makeCtx();
  vi.stubGlobal("caches", { default: edgeCache });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* ---- tests ---- */

describe("image-proxy /image route", () => {
  it("edge cache hit returns 200 with X-Cache-Source: edge and no KV read", async () => {
    const kv = makeKV();
    stubFetch(); // never called
    const params = { prompt: "a cat", seed: "1", width: "1024", height: "1024", uid: "user-a" };
    const request = imageRequest(params);

    const urlNoUid = new URL(request.url);
    urlNoUid.searchParams.delete("uid");
    await edgeCache.put(
      new Request(urlNoUid.toString(), request),
      new Response(new Uint8Array([9, 9]), {
        status: 200,
        headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=604800" },
      })
    );

    const res = await worker.fetch(request, baseEnv({ IMAGE_CACHE: kv }), ctx);

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Cache-Source")).toBe("edge");
    expect(res.headers.get("X-Image-Source")).toBe("cache");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=604800");
    expect(await res.arrayBuffer()).toEqual(new Uint8Array([9, 9]).buffer as ArrayBuffer);
    expect(kv.state.getCalls).toEqual([]);
  });

  it("KV hit returns 200 with X-Cache-Source: kv and warms the edge cache", async () => {
    const kv = makeKV();
    stubFetch(); // never called
    const params = { prompt: "a cat", seed: "1", width: "1024", height: "1024", uid: "user-a" };
    const canonicalKey = "img:default:" + stringToHash("a cat|1|1024|1024");
    kv.store.set(canonicalKey, new Uint8Array([7, 7, 7]).buffer as ArrayBuffer);

    const request = imageRequest(params);
    const res = await worker.fetch(request, baseEnv({ IMAGE_CACHE: kv }), ctx);

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Cache-Source")).toBe("kv");
    expect(res.headers.get("X-Image-Source")).toBe("cache");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=604800");
    expect(await res.arrayBuffer()).toEqual(new Uint8Array([7, 7, 7]).buffer as ArrayBuffer);

    await ctx.flush();
    const urlNoUid = new URL(request.url);
    urlNoUid.searchParams.delete("uid");
    const warmed = await edgeCache.match(new Request(urlNoUid.toString(), request));
    expect(warmed).toBeDefined();
    expect(warmed!.headers.get("X-Cache-Source")).toBeNull();
    expect(warmed!.headers.get("X-Image-Source")).toBeNull();
    expect(warmed!.status).toBe(200);
  });

  it("KV miss fetches from Pollinations, writes KV via waitUntil, and labels generated", async () => {
    const kv = makeKV();
    const { mock } = stubFetch(200, "image/png");
    const params = { prompt: "a cat", seed: "1", width: "1024", height: "1024", uid: "user-a" };
    const canonicalKey = "img:default:" + stringToHash("a cat|1|1024|1024");

    const request = imageRequest(params);
    const res = await worker.fetch(request, baseEnv({ IMAGE_CACHE: kv }), ctx);

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Cache-Source")).toBe("generated");
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=604800");
    expect(mock).toHaveBeenCalledTimes(1);
    // verify Bearer auth
    expect(mock.mock.calls[0][1].headers.Authorization).toMatch(/Bearer test-key/i);

    expect(ctx.jobs.length).toBeGreaterThan(0);
    await ctx.flush();
    expect(kv.state.putCalls).toEqual([canonicalKey]);
    expect(kv.store.get(canonicalKey)).toEqual(new Uint8Array([1, 2, 3, 4]).buffer as ArrayBuffer);
  });

  it("breaks immediately on 402 without retrying other models", async () => {
    const kv = makeKV();
    const { mock } = stubFetch(402);
    const params = { prompt: "a cat", seed: "1", width: "1024", height: "1024" };

    const res = await worker.fetch(imageRequest(params), baseEnv({ IMAGE_CACHE: kv }), ctx);

    expect(res.status).toBe(402);
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(await res.text()).toContain("Image Error");
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the next model when the first returns 400", async () => {
    const kv = makeKV();
    const mock = vi.fn(async () => {
      if (mock.mock.calls.length === 1) {
        return new Response(new Uint8Array(), { status: 400 });
      }
      return new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { "Content-Type": "image/jpeg" },
      });
    });
    vi.stubGlobal("fetch", mock);
    const params = { prompt: "a cat", seed: "1", width: "1024", height: "1024" };

    const res = await worker.fetch(imageRequest(params), baseEnv({ IMAGE_CACHE: kv }), ctx);

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Cache-Source")).toBe("generated");
    expect(res.headers.get("X-Image-Source")).toBe("pollinations");
    expect(mock).toHaveBeenCalledTimes(2);
    const secondUrl = mock.mock.calls[1][0] as string;
    expect(secondUrl).toContain("mai-image-2.6");
    expect(secondUrl).not.toContain("mai-image-2.6-flash");
  });

  it("returns ERROR_SVG with the last upstream status when all models fail", async () => {
    const kv = makeKV();
    const mock = vi.fn(async () => new Response(new Uint8Array(), { status: 500 }));
    vi.stubGlobal("fetch", mock);
    const params = { prompt: "a cat", seed: "1", width: "1024", height: "1024" };

    const res = await worker.fetch(imageRequest(params), baseEnv({ IMAGE_CACHE: kv }), ctx);

    expect(mock).toHaveBeenCalledTimes(3); // 3 models in chain
    expect(res.status).toBe(500); // last upstream status propagated
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(await res.text()).toContain("Image Error");
  });

  it("strips uid so two users share the same cache key", async () => {
    const kv = makeKV();
    const { mock } = stubFetch();

    const paramsA = { prompt: "a cat", seed: "1", width: "1024", height: "1024", uid: "user-a" };
    const paramsB = { prompt: "a cat", seed: "1", width: "1024", height: "1024", uid: "user-b" };

    const resA = await worker.fetch(imageRequest(paramsA), baseEnv({ IMAGE_CACHE: kv }), ctx);
    expect(resA.headers.get("X-Cache-Source")).toBe("generated");
    expect(resA.headers.get("X-Image-Source")).toBe("pollinations");
    await ctx.flush();

    const resB = await worker.fetch(imageRequest(paramsB), baseEnv({ IMAGE_CACHE: kv }), ctx);
    expect(resB.status).toBe(200);
    expect(resB.headers.get("X-Cache-Source")).toBe("edge");
    expect(resB.headers.get("X-Image-Source")).toBe("cache");

    expect(mock).toHaveBeenCalledTimes(1);
    expect(kv.state.putCalls).toHaveLength(1);
    expect(kv.state.putCalls[0]).toBe("img:default:" + stringToHash("a cat|1|1024|1024"));
    expect(kv.state.getCalls.length).toBeLessThanOrEqual(1);
  });

  it("skips to Pollinations when the KV read throws (graceful, no 500)", async () => {
    const kv = makeKV();
    kv.state.failGet = true;
    const { mock } = stubFetch();
    const params = { prompt: "a cat", seed: "1", width: "1024", height: "1024" };

    const res = await worker.fetch(imageRequest(params), baseEnv({ IMAGE_CACHE: kv }), ctx);

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Cache-Source")).toBe("generated");
    expect(mock).toHaveBeenCalledTimes(1);
    expect(kv.state.getCalls).toHaveLength(1);
  });

  it("works without an IMAGE_CACHE binding (KV skipped, goes to Pollinations)", async () => {
    const { mock } = stubFetch();
    const params = { prompt: "a cat", seed: "1", width: "1024", height: "1024" };

    const env = baseEnv();
    delete env.IMAGE_CACHE;

    const request = imageRequest(params);
    const res = await worker.fetch(request, env, ctx);

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Cache-Source")).toBe("generated");
    expect(mock).toHaveBeenCalledTimes(1);

    await ctx.flush();
    const edgeUrl = new URL("/image", BASE);
    for (const [k, v] of Object.entries(params)) edgeUrl.searchParams.set(k, v);
    const warmed = await edgeCache.match(new Request(edgeUrl.toString(), request));
    expect(warmed).toBeDefined();
    expect(warmed!.status).toBe(200);
  });

  // --- CF AI tests ---

  it("CF AI succeeds → image returned, X-Image-Source: cf-ai, no Pollinations fetch", async () => {
    const kv = makeKV();
    const { mock } = stubFetch();
    const aiBind = makeAIBindSuccess();

    const res = await worker.fetch(
      imageRequest({ prompt: "a cat", seed: "1", width: "1024", height: "1024" }),
      baseEnv({ IMAGE_CACHE: kv, AI: aiBind }),
      ctx
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Cache-Source")).toBe("generated");
    expect(res.headers.get("X-Image-Source")).toBe("cf-ai");
    expect(aiBind.run).toHaveBeenCalledTimes(1);
    expect(mock).not.toHaveBeenCalled();
  });

  it("CF AI returns null → falls through to Pollinations Bearer, succeeds, X-Image-Source: pollinations", async () => {
    const kv = makeKV();
    const { mock } = stubFetch(200, "image/png");
    const aiBind = makeAIBindFail();

    const res = await worker.fetch(
      imageRequest({ prompt: "a cat", seed: "1", width: "1024", height: "1024" }),
      baseEnv({ IMAGE_CACHE: kv, AI: aiBind }),
      ctx
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Cache-Source")).toBe("generated");
    expect(res.headers.get("X-Image-Source")).toBe("pollinations");
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(aiBind.run).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("CF AI null (no binding) + Pollinations 402 → 402 returned", async () => {
    const kv = makeKV();
    const { mock } = stubFetch(402);
    const params = { prompt: "a cat", seed: "1", width: "1024", height: "1024" };

    const res = await worker.fetch(
      imageRequest(params),
      baseEnv({ IMAGE_CACHE: kv, AI: null }),
      ctx
    );

    expect(res.status).toBe(402);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("CF AI null + all Pollinations fail → last upstream status returned", async () => {
    const kv = makeKV();
    const mock = vi.fn(async () => new Response(new Uint8Array(), { status: 500 }));
    vi.stubGlobal("fetch", mock);
    const params = { prompt: "a cat", seed: "1", width: "1024", height: "1024" };

    const res = await worker.fetch(
      imageRequest(params),
      baseEnv({ IMAGE_CACHE: kv, AI: null }),
      ctx
    );

    expect(mock).toHaveBeenCalledTimes(3);
    expect(res.status).toBe(500);
  });
});

describe("image-proxy /_purge route", () => {
  it("with a correct Bearer token lists and deletes keys by catalogHash prefix", async () => {
    const kv = makeKV();
    kv.store.set("img:hashA:111", new Uint8Array([1]).buffer as ArrayBuffer);
    kv.store.set("img:hashA:222", new Uint8Array([2]).buffer as ArrayBuffer);
    kv.store.set("img:hashB:333", new Uint8Array([3]).buffer as ArrayBuffer);

    const request = new Request(`${BASE}/_purge?catalogHash=hashA`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    const res = await worker.fetch(
      request,
      baseEnv({ CRON_ADMIN_TOKEN: TOKEN, IMAGE_CACHE: kv }),
      ctx
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(await res.json()).toEqual({ purged: 2 });
    expect(kv.state.deleteCalls.sort()).toEqual(["img:hashA:111", "img:hashA:222"]);
    expect(kv.store.has("img:hashB:333")).toBe(true);
  });

  it("returns 401 for a wrong Bearer token", async () => {
    const kv = makeKV();
    const request = new Request(`${BASE}/_purge?catalogHash=hashA`, {
      method: "POST",
      headers: { Authorization: "Bearer wrong-token" },
    });

    const res = await worker.fetch(
      request,
      baseEnv({ CRON_ADMIN_TOKEN: TOKEN, IMAGE_CACHE: kv }),
      ctx
    );

    expect(res.status).toBe(401);
    expect(kv.state.deleteCalls).toEqual([]);
  });

  it("returns 403 when CRON_ADMIN_TOKEN is not configured", async () => {
    const kv = makeKV();
    const request = new Request(`${BASE}/_purge?catalogHash=hashA`, { method: "POST" });

    const env = baseEnv({ IMAGE_CACHE: kv });
    delete env.CRON_ADMIN_TOKEN;

    const res = await worker.fetch(request, env, ctx);

    expect(res.status).toBe(403);
    expect(kv.state.deleteCalls).toEqual([]);
  });
});
