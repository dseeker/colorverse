/**
 * ColorVerse Image Proxy Worker
 * Proxies image generation requests to Pollinations so the API key
 * never reaches the client. Also adds cache headers.
 *
 * Routes:
 *   GET  /data          — serve site-data.json from SITE_DATA KV (24h CDN cache)
 *   GET  /              — proxy image generation (Pollinations), 7-day edge cache
 *   GET  /image         — KV-cached image generation (edge → KV → Pollinations)
 *   POST /_purge        — Bearer-gated; delete IMAGE_CACHE keys for a catalogHash
 *
 * Environment variables (set via wrangler.toml / CF dashboard):
 *   POLLINATIONS_API_KEY
 *   ALLOWED_ORIGINS      (comma-separated, default "*")
 *   CRON_ADMIN_TOKEN     (Bearer token required to call POST /_purge)
 *
 * KV namespaces:
 *   SITE_DATA   — site-data.json
 *   IMAGE_CACHE — generated image bytes, keyed "img:{catalogHash}:{hash}"
 */

import { POLLINATIONS_CONFIG, ERROR_SVG } from "../../shared/constants.js";
import { corsHeaders, fetchWithTimeout, stringToHash } from "../../shared/utils.js";

const IMAGE_CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

function svgResponse(svg, status, cors) {
  return new Response(svg, {
    status,
    headers: { "Content-Type": "image/svg+xml", ...cors },
  });
}

function jsonError(message, status, cors) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

/**
 * Final client-facing image response. `source` labels where the bytes came
 * from: edge | kv | generated.
 */
function imageResponse(body, contentType, cors, source) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${IMAGE_CACHE_TTL}`,
      "X-Cache-Source": source,
      ...cors,
    },
  });
}

/**
 * The variant we store in the CF edge cache (and use to warm it from a KV hit).
 * Deliberately omits X-Cache-Source — it's added per-request on read so the
 * same stored bytes can later be served back as "edge" or "kv".
 */
function cacheableImageResponse(body, contentType) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${IMAGE_CACHE_TTL}`,
    },
  });
}

/**
 * Minimum image dimension. 768 is the floor accepted by MAI-family models
 * ("'width' must be at least 768 pixels"), and is fine for every other model
 * in the chain. We floor any request up to this so the first (preferred)
 * model succeeds without falling through on a 400 — the client requests
 * 300/400/600 for thumbnails, but Pollinations rejects those from MAI.
 */
const DEFAULT_IMAGE_DIMENSION = 768;
const MIN_IMAGE_DIMENSION = 768;

/** Floors a dimension value up to MIN_IMAGE_DIMENSION. */
function floorDimension(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return String(DEFAULT_IMAGE_DIMENSION);
  }
  return n < MIN_IMAGE_DIMENSION ? String(MIN_IMAGE_DIMENSION) : String(Math.round(n));
}

/**
 * Model fallback loop. Tries each model in `modelChain` in order; the first 200
 * wins. A 402 aborts immediately (balance exhausted — all models use same
 * account); a 400/404 or network error falls through to the next model
 * (different models accept different params).
 *
 * Returns { ok: true, status, body, contentType } on success, or
 * { ok: false, status } (the last observed upstream error status) on failure.
 */
async function runModelFallback(prompt, baseParams, modelChain) {
  let lastErrorStatus = 502;
  for (const model of modelChain) {
    const params = new URLSearchParams({ ...baseParams, model });
    const upstreamUrl = `${POLLINATIONS_CONFIG.IMAGE_BASE_URL}/${encodeURIComponent(prompt)}?${params}`;

    try {
      const upstream = await fetchWithTimeout(upstreamUrl, {}, 60000);

      if (!upstream.ok) {
        console.error(
          `[image-proxy] Upstream ${upstream.status} for model=${model}: ${upstreamUrl.substring(0, 120)}`
        );
        lastErrorStatus = upstream.status;
        // 402 → balance exhausted, no point retrying (all models use same account).
        // 400 → model-specific bad request (params/model combo), try next model.
        // 404 → model not found, try next model.
        if (upstream.status === 402) {
          break;
        }
        continue;
      }

      const contentType = upstream.headers.get("Content-Type") || "image/jpeg";
      const body = await upstream.arrayBuffer();
      return { ok: true, status: 200, body, contentType };
    } catch (err) {
      console.error(`[image-proxy] fetch error for model=${model}: ${err.message}`);
      lastErrorStatus = 502;
      // network error → try next model
      continue;
    }
  }
  return { ok: false, status: lastErrorStatus };
}

async function serveSiteData(request, env, ctx, cors) {
  // Cache key is the request URL itself so cache-bust query strings work
  // for purging stale entries. The response body is identical regardless.
  const cacheKey = new Request(request.url, request);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    // Re-add CORS per request (cached response is stored without CORS headers).
    return new Response(cached.body, {
      status: cached.status,
      headers: { ...Object.fromEntries(cached.headers), ...cors },
    });
  }

  if (!env.SITE_DATA) {
    return new Response(JSON.stringify({ error: "KV binding not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  try {
    const body = await env.SITE_DATA.get("site-data.json");
    if (!body) {
      return new Response(JSON.stringify({ error: "site-data.json not found in KV" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }
    // Cache the body WITHOUT CORS headers — they're added per-request on hit.
    const cachedResponse = new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=86400",
      },
    });
    ctx.waitUntil(cache.put(cacheKey, cachedResponse.clone()));
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      headers: { ...Object.fromEntries(cachedResponse.headers), ...cors },
    });
  } catch (err) {
    console.error("[image-proxy] /data error:", err.message);
    return new Response(JSON.stringify({ error: "Failed to read site data" }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
}

/**
 * GET /image — KV-cached image generation.
 *
 * Request: GET /image?prompt=<p>&seed=<s>&width=<w>&height=<h>&uid=<hashedUid>
 *
 * `uid` is observability-only — it is stripped from the cache identity so the
 * same image is shared across users. `catalogHash` (optional, defaults to
 * "default") partitions the KV store by catalog version so /_purge can drop an
 * entire catalog's images by prefix.
 *
 * Lookup order: CF edge cache → IMAGE_CACHE KV → Pollinations fallback chain.
 * A missing IMAGE_CACHE binding (or a KV read error) degrades gracefully to the
 * Pollinations path.
 */
async function serveCachedImage(request, url, env, ctx) {
  const cors = corsHeaders(request, env);

  const prompt = url.searchParams.get("prompt");
  if (!prompt) {
    return svgResponse(ERROR_SVG, 400, cors);
  }

  const apiKey = env.POLLINATIONS_API_KEY;
  if (!apiKey) {
    return svgResponse(ERROR_SVG, 503, cors);
  }

  const seed = url.searchParams.get("seed") || String(Math.floor(Math.random() * 100000));
  const width = floorDimension(url.searchParams.get("width") || DEFAULT_IMAGE_DIMENSION);
  const height = floorDimension(url.searchParams.get("height") || DEFAULT_IMAGE_DIMENSION);
  const catalogHash = url.searchParams.get("catalogHash") || "default";

  // Edge-cache key: the full URL minus `uid`, so identical images share the
  // edge cache across users.
  const urlWithoutUid = new URL(url.toString());
  urlWithoutUid.searchParams.delete("uid");
  const edgeKey = new Request(urlWithoutUid.toString(), request);

  // Canonical KV key: img:{catalogHash}:{hash}. The hash covers the actual
  // image identity; the catalogHash prefix lets /_purge drop a whole catalog
  // version in one pass.
  const canonicalKey =
    "img:" + catalogHash + ":" + stringToHash(prompt + "|" + seed + "|" + width + "|" + height);

  const cache = caches.default;

  // 1. CF edge cache
  const edgeHit = await cache.match(edgeKey);
  if (edgeHit) {
    return new Response(edgeHit.body, {
      status: edgeHit.status,
      headers: {
        ...Object.fromEntries(edgeHit.headers),
        "X-Cache-Source": "edge",
        ...cors,
      },
    });
  }

  // 2. KV (only if bound). A KV read error must never fail the request —
  //    fall through to Pollinations.
  if (env.IMAGE_CACHE) {
    try {
      const bytes = await env.IMAGE_CACHE.get(canonicalKey, { type: "arrayBuffer" });
      if (bytes) {
        // Warm the edge cache from the KV hit (best-effort, non-blocking).
        ctx.waitUntil(
          cache.put(edgeKey, cacheableImageResponse(bytes.slice(0), "image/jpeg").clone())
        );
        // KV stores raw bytes only, so the content type is the Pollinations
        // default (image/jpeg) rather than a passthrough of upstream headers.
        return imageResponse(bytes.slice(0), "image/jpeg", cors, "kv");
      }
    } catch (err) {
      console.error(`[image-proxy] KV read error: ${err.message}`);
    }
  }

  // 3. Pollinations fallback chain
  const baseParams = {
    width,
    height,
    seed,
    nologo: "true",
    referrer: "dseeker.github.io",
    key: apiKey,
    enhance: url.searchParams.get("enhance") || "false",
    quality: url.searchParams.get("quality") || "medium",
  };

  const result = await runModelFallback(
    prompt,
    baseParams,
    POLLINATIONS_CONFIG.IMAGE_MODEL_FALLBACKS
  );
  if (!result.ok) {
    return svgResponse(ERROR_SVG, result.status, cors);
  }

  // Persist to KV + warm the edge cache (best-effort, non-blocking).
  if (env.IMAGE_CACHE) {
    ctx.waitUntil(env.IMAGE_CACHE.put(canonicalKey, result.body.slice(0)));
  }
  ctx.waitUntil(
    cache.put(edgeKey, cacheableImageResponse(result.body.slice(0), result.contentType).clone())
  );

  return imageResponse(result.body.slice(0), result.contentType, cors, "generated");
}

/**
 * POST /_purge?catalogHash=<hash> — delete all IMAGE_CACHE keys for a catalog
 * version. Bearer-gated by CRON_ADMIN_TOKEN (403 if the token is unset, 401 if
 * the presented token is wrong). Lets a cron drop orphaned images after a
 * catalog regenerates.
 */
async function handlePurge(request, url, env) {
  const cors = corsHeaders(request, env);

  if (request.method !== "POST") {
    return jsonError("Method not allowed", 405, cors);
  }

  // Bearer gate: 403 if the admin token is not configured, 401 if wrong.
  if (typeof env.CRON_ADMIN_TOKEN !== "string" || env.CRON_ADMIN_TOKEN === "") {
    return jsonError("Purge endpoint is not configured", 403, cors);
  }
  const header = request.headers.get("Authorization") || "";
  if (header !== `Bearer ${env.CRON_ADMIN_TOKEN}`) {
    return jsonError("Invalid or missing Bearer token", 401, cors);
  }

  if (!env.IMAGE_CACHE) {
    return jsonError("KV binding not configured", 503, cors);
  }

  const catalogHash = url.searchParams.get("catalogHash");
  if (!catalogHash) {
    return jsonError("catalogHash query param required", 400, cors);
  }

  const prefix = "img:" + catalogHash + ":";
  let purged = 0;
  try {
    const { keys } = await env.IMAGE_CACHE.list({ prefix });
    for (const { name } of keys) {
      await env.IMAGE_CACHE.delete(name);
      purged += 1;
    }
  } catch (err) {
    console.error(`[image-proxy] /_purge error: ${err.message}`);
    return jsonError("Purge failed", 502, cors);
  }

  return new Response(JSON.stringify({ purged }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request, env);
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Admin purge endpoint (POST, Bearer-gated).
    if (url.pathname === "/_purge") {
      return handlePurge(request, url, env);
    }

    if (request.method !== "GET") {
      return svgResponse(ERROR_SVG, 405, cors);
    }

    if (url.pathname === "/data") {
      return await serveSiteData(request, env, ctx, cors);
    }

    // KV-cached image route
    if (url.pathname === "/image") {
      return await serveCachedImage(request, url, env, ctx);
    }

    // Legacy root image route (behavior preserved)
    const prompt = url.searchParams.get("prompt");
    if (!prompt) {
      return svgResponse(ERROR_SVG, 400, cors);
    }

    const apiKey = env.POLLINATIONS_API_KEY;
    if (!apiKey) {
      return svgResponse(ERROR_SVG, 503, cors);
    }

    // Model fallback chain: caller may override, otherwise use full chain.
    // First 200 wins; fall back on any non-200 or network error.
    const requestedModel = url.searchParams.get("model");
    const modelChain = requestedModel
      ? [
          requestedModel,
          ...POLLINATIONS_CONFIG.IMAGE_MODEL_FALLBACKS.filter(m => m !== requestedModel),
        ]
      : POLLINATIONS_CONFIG.IMAGE_MODEL_FALLBACKS;

    const baseParams = {
      width: floorDimension(url.searchParams.get("width") || DEFAULT_IMAGE_DIMENSION),
      height: floorDimension(url.searchParams.get("height") || DEFAULT_IMAGE_DIMENSION),
      seed: url.searchParams.get("seed") || String(Math.floor(Math.random() * 100000)),
      nologo: "true",
      referrer: "dseeker.github.io",
      key: apiKey,
      // enhance=false so style keywords in the prompt aren't rewritten away
      // by Pollinations' prompt-enhancer. Decided 2026-10-09.
      enhance: url.searchParams.get("enhance") || "false",
      quality: url.searchParams.get("quality") || "medium",
    };

    // Check CF cache first — cache key is the full client URL (includes requested
    // model if any), so a cache hit short-circuits before the fallback loop.
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: { ...Object.fromEntries(cachedResponse.headers), ...cors },
      });
    }

    const result = await runModelFallback(prompt, baseParams, modelChain);
    if (!result.ok) {
      return svgResponse(ERROR_SVG, result.status, cors);
    }

    const response = new Response(result.body, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": `public, max-age=${IMAGE_CACHE_TTL}`,
        ...cors,
      },
    });

    // Store in CF cache (non-blocking)
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  },
};
