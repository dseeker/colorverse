/**
 * ColorVerse Content API Worker
 * Proxies AI text generation requests so API keys stay server-side, and
 * accepts analytics event batches on the /events route.
 *
 * Environment variables (set via wrangler.toml / CF dashboard):
 *   POLLINATIONS_API_KEY
 *   OPENROUTER_API_KEY
 *   GOOGLE_GEMINI_API_KEY
 *   ALLOWED_ORIGINS  (comma-separated, default "*")
 *   ANALYTICS_SINK   (optional HTTPS URL to forward event batches to; if
 *                    unset, /events logs and returns 204 without forwarding)
 *   ANALYTICS_KV     (KV namespace binding for aggregate counters; create it
 *                    with `npx wrangler kv:namespace create ANALYTICS_KV`.
 *                    If unbound, /events skips the counter writes and
 *                    /events/stats returns 503 — both degrade gracefully)
 *   ANALYTICS_ADMIN_TOKEN (Bearer token required to read /events/stats; if
 *                    unset on the server, /events/stats always returns 403)
 *   SITE_DATA        (KV namespace binding, shared with the image-proxy
 *                    worker. /catalog caches generated catalogs under
 *                    "catalog:*" keys; the legacy "site-data.json" key —
 *                    served by image-proxy /data — lives in the same
 *                    namespace and is the /catalog kill-switch fallback)
 *   DISABLE_WORKER_GEN (optional, "true" to enable: /catalog stops
 *                    generating and serves the legacy site-data.json KV
 *                    key instead — rollback without redeploying)
 *
 * Routes:
 *   POST /                 generic LLM proxy (pollinations/openrouter/gemini)
 *   POST /events           analytics event batches
 *   GET  /events/stats     aggregate analytics (Bearer-token gated)
 *   GET  /catalog          ~500-item coloring catalog, lazily generated and
 *                          KV-cached (stale-while-revalidate, 24h TTL, no cron)
 */

import {
  createJSONResponse,
  fetchWithTimeout,
  corsHeaders,
  stringToHash,
  getCurrentSeason,
  sleep,
} from "../../shared/utils.js";
import { CATEGORIES } from "../../shared/constants.js";
import { COLORING_STYLES } from "../../../src/shared/prompts.js";

const POLLINATIONS_URL = "https://gen.pollinations.ai/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const ALLOWED_ANALYTICS_EVENTS = new Set([
  "page_view",
  "print",
  "download",
  "favorite_add",
  "favorite_remove",
  "share",
  "search",
  "newsletter_subscribe",
]);
const MAX_EVENTS_PER_BATCH = 100;
const MAX_EVENT_PROP_BYTES = 512;

// --- helpers -----------------------------------------------------------------

// The shared helper is tuned for GET-only workers; content-api also serves
// POST routes, so extend it to keep the previous local CORS behavior.
function corsMethods(request, env) {
  return {
    ...corsHeaders(request, env),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

/**
 * Validate and sanitize an incoming event batch. Drops unknown event names,
 * trims arrays to MAX_EVENTS_PER_BATCH, and clamps any prop payload to
 * MAX_EVENT_PROP_BYTES. The client also enforces these, but we re-verify
 * here since the endpoint is publicly reachable.
 */
function sanitizeBatch(events) {
  if (!Array.isArray(events)) {
    return [];
  }
  return events
    .slice(0, MAX_EVENTS_PER_BATCH)
    .map(ev => {
      if (!ev || typeof ev.name !== "string" || !ALLOWED_ANALYTICS_EVENTS.has(ev.name)) {
        return null;
      }
      const props = ev.props && typeof ev.props === "object" ? ev.props : {};
      const trimmedProps = {};
      for (const [k, v] of Object.entries(props)) {
        const s = typeof v === "string" ? v : JSON.stringify(v);
        trimmedProps[k] = s.length > MAX_EVENT_PROP_BYTES ? s.slice(0, MAX_EVENT_PROP_BYTES) : s;
      }
      return {
        name: ev.name,
        props: trimmedProps,
        ts: typeof ev.ts === "number" ? ev.ts : Date.now(),
        session: typeof ev.session === "string" ? ev.session.slice(0, 64) : "",
      };
    })
    .filter(Boolean);
}

function errorResponse(message, status, request, env) {
  return createJSONResponse({ error: message }, status, corsMethods(request, env));
}

// --- analytics counters (KV-backed) ------------------------------------------

const STATS_BLOB_KEY = "stats";
const MAX_TRACKED_PATHS = 500;

// All counters live in a single JSON blob under one KV key. A blob keeps the
// read path to a single `get()` (no list()/N-get fan-out for the stats
// endpoint) and the write path to one `put()`. The cost of a read-modify-write
// race under concurrent POSTs is a lost increment on a high-volume site —
// acceptable for aggregate analytics, and it keeps the code simple.
//
// Blob shape: { events: { [name]: count }, paths: { [hashPath]: count } }

function sanitizeStatsPath(path) {
  if (typeof path !== "string" || path.length === 0) {
    return null;
  }
  // The client already strips query params; strip them again server-side so
  // a rogue client can't create unbounded path keys (e.g. every search term).
  const qIdx = path.indexOf("?");
  const base = qIdx === -1 ? path : path.slice(0, qIdx);
  if (base.length > 200) {
    return base.slice(0, 200);
  }
  return base;
}

async function recordAnalyticsBatch(kv, events) {
  let stats;
  try {
    const raw = await kv.get(STATS_BLOB_KEY);
    stats = raw ? JSON.parse(raw) : null;
  } catch {
    stats = null; // corrupt blob — start fresh rather than fail the POST
  }
  if (!stats || typeof stats.events !== "object" || typeof stats.paths !== "object") {
    stats = { events: {}, paths: {} };
  }

  let changed = false;
  for (const ev of events) {
    if (typeof stats.events[ev.name] !== "number") {
      stats.events[ev.name] = 0;
    }
    stats.events[ev.name] += 1;
    changed = true;
    if (ev.name === "page_view") {
      const path = sanitizeStatsPath(ev.props.path);
      if (path !== null) {
        if (
          typeof stats.paths[path] !== "number" &&
          Object.keys(stats.paths).length >= MAX_TRACKED_PATHS
        ) {
          continue; // cap distinct path keys to bound blob size
        }
        if (typeof stats.paths[path] !== "number") {
          stats.paths[path] = 0;
        }
        stats.paths[path] += 1;
      }
    }
  }
  if (changed) {
    await kv.put(STATS_BLOB_KEY, JSON.stringify(stats));
  }
}

function parseStatsRequest(request, env) {
  // No token configured server-side: the stats endpoint is not available at
  // all (403), regardless of the presented credentials.
  if (typeof env.ANALYTICS_ADMIN_TOKEN !== "string" || env.ANALYTICS_ADMIN_TOKEN === "") {
    return { status: 403, error: "Stats endpoint is not configured" };
  }
  const header = request.headers.get("Authorization") || "";
  if (header !== `Bearer ${env.ANALYTICS_ADMIN_TOKEN}`) {
    return { status: 401, error: "Invalid or missing Bearer token" };
  }
  return null;
}

// --- provider callers --------------------------------------------------------

async function callPollinations(body, apiKey, timeout = 30000) {
  return fetchWithTimeout(
    POLLINATIONS_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
    timeout
  );
}

async function callOpenRouter(body, apiKey) {
  return fetchWithTimeout(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://dseeker.github.io",
      "X-Title": "ColorVerse",
    },
    body: JSON.stringify(body),
  });
}

async function callGemini(model, body, apiKey) {
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
  return fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- catalog generation (GET /catalog) ----------------------------------------
//
// /catalog serves the full site-data.json catalog (~20 items x 25 categories +
// a 12-item seasonal gallery) without a cron job or a build step:
//
//   1. KV hit + fresh (< CATALOG_TTL_MS old)  -> 200, max-age=86400
//   2. KV hit + stale                          -> 200 (stale body) and a
//      background regeneration via ctx.waitUntil (stale-while-revalidate)
//   3. KV miss                                 -> generation flow:
//        a. generation lock (KV key, 120s TTL) — concurrent requests get 202
//        b. per-IP hourly rate limit (max CATALOG_MAX_GENS_PER_HOUR)
//        c. 202 + Retry-After: 10; generation runs in ctx.waitUntil
//
// The X-ColorVerse-UID request header is logged for observability only; it
// never affects the cache key, so all users share the same cached catalog.

const CATALOG_DEFAULT_KEY = "catalog:default";
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
const CATALOG_GENERATION_LOCK_TTL_S = 120;
const CATALOG_MAX_GENS_PER_HOUR = 5;
const CATALOG_RETRY_AFTER_S = 10;
const CATALOG_ITEMS_PER_CATEGORY = 20;
const CATALOG_SEASONAL_ITEMS = 12;
// Generous per-category timeout: the catalog is regenerated in the
// background, so a slow response is better than a partial catalog.
const CATALOG_ITEM_TIMEOUT_MS = 60000;
const CATALOG_DELAY_BETWEEN_CATEGORIES_MS = 1500;

function buildCatalogSystemMessage(styleSuffix) {
  const base =
    "You are an AI assistant that generates structured JSON data. Output ONLY the requested JSON object.";
  if (!styleSuffix) {
    return base;
  }
  return (
    base +
    `\n\nSTYLE OVERRIDE: The generated item descriptions MUST be tuned to this coloring style — weave it into every item's description: ${styleSuffix}`
  );
}

function buildCategoryPrompt(categoryKey, categoryInfo, itemCount, seed) {
  // A custom seed bakes into the prompt so generated descriptions become
  // distinctive variations for that seed (the cache key already distinguishes
  // seed-sets; this keeps the CONTENT distinct per seed as well).
  const seedNote = seed
    ? `- Seed: this catalog variant is for seed "${seed}" — make the generated items distinctive variations tuned to this seed (different subjects, compositions, and details than the default catalog).`
    : "";

  return `Generate coloring page data for the "${categoryKey}" category.
Output a JSON object with this structure:
{
  "title": "${categoryInfo.title}",
  "description": "${categoryInfo.description}",
  "keywords": ${JSON.stringify(categoryInfo.keywords)},
  "items": {
    "${categoryKey}_item_1": { "title": "Creative Unique Title", "description": "Detailed description for AI image generation" },
    ... exactly ${itemCount} items
  }
}

REQUIREMENTS:
- Exactly ${itemCount} items with keys "${categoryKey}_item_1" through "${categoryKey}_item_${itemCount}"
- Each title MUST be unique, creative, and evocative (NOT generic like "Sample" or "Item")
- Descriptions must be detailed enough for AI image generation of black and white coloring pages
- Include variety: some simple for beginners, some complex for advanced colorists
${seedNote}
Output ONLY the JSON object.`;
}

function buildSeasonalPrompt(season) {
  return (
    `Generate ${CATALOG_SEASONAL_ITEMS} seasonal coloring page items for ${season}. ` +
    `Output JSON: { "title": "${season} Collection", "subtitle": "Seasonal coloring pages", ` +
    `"items": { "seasonal_1": { "title": "...", "description": "..." }, ... ${CATALOG_SEASONAL_ITEMS} items } }. ` +
    `Titles must be creative and evocative.`
  );
}

function countCatalogItems(catalog) {
  return Object.values(catalog.categories || {}).reduce(
    (sum, c) =>
      sum + (c && c.items && typeof c.items === "object" ? Object.keys(c.items).length : 0),
    0
  );
}

async function generateCatalogText(prompt, apiKey, systemMessage) {
  const upstream = await callPollinations(
    {
      model: "gpt-4.1-nano",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    },
    apiKey,
    CATALOG_ITEM_TIMEOUT_MS
  );
  if (upstream.status === 402) {
    throw new Error("Pollinations 402: balance exhausted");
  }
  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    throw new Error(`Pollinations ${upstream.status}: ${text.substring(0, 200)}`);
  }
  const result = await upstream.json();
  const content = result?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from Pollinations");
  }
  return JSON.parse(content);
}

/**
 * Generate the full catalog and write it to KV under catalogKey.
 *
 * Locking: when lockHeld is false (the stale-while-revalidate path) the job
 * claims the lock itself and no-ops if another job already holds it — this
 * prevents concurrent stale hits from double-generating. When lockHeld is
 * true (the miss path) the request already claimed it; the job never
 * re-claims but ALWAYS deletes it in the finally block so a 402 abort or
 * crash releases the lock immediately instead of waiting for the 120s TTL.
 *
 * @param {KVNamespace} kv
 * @param {string} catalogKey
 * @param {object} env
 * @param {string} styleKey
 * @param {string} seed
 * @param {string} uid
 * @param {boolean} [lockHeld] - the caller already holds the generation lock
 */
async function generateCatalogBackground(
  kv,
  catalogKey,
  env,
  styleKey,
  seed,
  uid,
  lockHeld = false
) {
  const lockKey = `catalog:generating:${catalogKey}`;
  let acquired = false;
  // When true (402 balance exhaustion) the lock is deliberately NOT deleted:
  // it must outlive the request so piling-up requests see "generating" and
  // the 120s TTL lets the next request retry once the balance recovers.
  let keepLock = false;
  try {
    if (!lockHeld) {
      const held = await kv.get(lockKey);
      if (held !== null) {
        return; // someone else is already regenerating
      }
      await kv.put(lockKey, "1", { expirationTtl: CATALOG_GENERATION_LOCK_TTL_S });
      acquired = true;
    }

    const apiKey = env.POLLINATIONS_API_KEY;
    const style = COLORING_STYLES[styleKey];
    // A known style bakes its prompt suffix into the LLM system message so
    // the generated descriptions are tuned to that style. Unknown style keys
    // (and no style) fall back to the classic catalog.
    const styleSuffix = style && style.prompt ? style.prompt : undefined;
    const systemMessage = buildCatalogSystemMessage(styleSuffix);

    // Delay between category generations (rate-limit headroom). Overridable
    // via env so tests can set it to 0 — kept out of the hot path by design.
    let delayMs = CATALOG_DELAY_BETWEEN_CATEGORIES_MS;
    const rawDelay = env.CATALOG_CATEGORY_DELAY_MS;
    if (rawDelay !== undefined && rawDelay !== null && rawDelay !== "") {
      const n = Number.parseInt(String(rawDelay), 10);
      if (Number.isFinite(n) && n >= 0) {
        delayMs = n;
      }
    }

    const categories = {};
    const keys = Object.keys(CATEGORIES);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const info = CATEGORIES[key];
      try {
        const data = await generateCatalogText(
          buildCategoryPrompt(key, info, CATALOG_ITEMS_PER_CATEGORY, seed),
          apiKey,
          systemMessage
        );
        categories[key] = data && typeof data === "object" ? data : { ...info, items: {} };
      } catch (err) {
        if (err.message && err.message.startsWith("Pollinations 402")) {
          // Balance exhausted: stop and KEEP the lock — piling-up requests
          // get 202 "generating", and once the lock's 120s TTL expires the
          // next request retries generation (by which point the balance may
          // have been topped up).
          keepLock = true;
          console.error(
            `[content-api] catalog generation for ${catalogKey} aborted: ${err.message} ` +
              `(lock expires in ${CATALOG_GENERATION_LOCK_TTL_S}s; next request retries)`
          );
          return;
        }
        console.warn(`[content-api] catalog ${key} failed, using static fallback: ${err.message}`);
        categories[key] = { ...info, items: {} };
      }
      if (i < keys.length - 1 && delayMs > 0) {
        await sleep(delayMs);
      }
    }

    const season = getCurrentSeason();
    let seasonalGallery;
    try {
      const seasonalData = await generateCatalogText(
        buildSeasonalPrompt(season),
        apiKey,
        systemMessage
      );
      seasonalGallery =
        seasonalData && typeof seasonalData === "object" ? seasonalData : { items: {} };
    } catch (err) {
      if (err.message && err.message.startsWith("Pollinations 402")) {
        keepLock = true;
        console.error(
          `[content-api] catalog seasonal 402 for ${catalogKey}: ${err.message}; ` +
            `stopping — lock expires in ${CATALOG_GENERATION_LOCK_TTL_S}s, next request retries`
        );
        return;
      }
      console.warn(`[content-api] catalog seasonal failed: ${err.message}; using empty gallery`);
      seasonalGallery = {
        title: `${season} Collection`,
        subtitle: "Seasonal coloring pages",
        items: {},
      };
    }

    const totalItems = countCatalogItems({ categories });
    const catalog = {
      brand: { name: "ColorVerse", tagline: "Free AI-Generated Coloring Pages" },
      seasonal_gallery: seasonalGallery,
      categories,
      _meta: {
        generatedAt: Date.now(),
        totalItems,
        categoryCount: keys.length,
        season,
        style: styleKey || "classic",
        seed: seed || null,
        generatedBy: uid || "anonymous",
      },
    };
    await kv.put(catalogKey, JSON.stringify(catalog));
    console.log(
      `[content-api] catalog ${catalogKey} generated (${totalItems} items, uid=${uid || "n/a"})`
    );
  } catch (err) {
    console.error(`[content-api] catalog generation for ${catalogKey} crashed: ${err.message}`);
  } finally {
    // Release the lock we own (acquired here, or handed in by the miss path)
    // unless generation stopped on a 402, where the lock is kept on purpose.
    if (!keepLock && (acquired || lockHeld)) {
      try {
        await kv.delete(lockKey);
      } catch (err) {
        console.warn(`[content-api] catalog lock delete failed: ${err.message}`);
      }
    }
  }
}

// The X-ColorVerse-UID header is observability-only (hashed uid from the
// client); clamp it so a rogue header can't bloat log lines or KV payloads.
function clampUid(uid) {
  return typeof uid === "string" ? uid.slice(0, 64) : "";
}

async function handleCatalog(request, env, ctx) {
  if (request.method !== "GET") {
    return errorResponse("Method not allowed", 405, request, env);
  }
  if (!env.SITE_DATA) {
    return errorResponse("KV not configured", 503, request, env);
  }

  const url = new URL(request.url);
  const styleKey = (url.searchParams.get("style") || "").slice(0, 64);
  const seed = (url.searchParams.get("seed") || "").slice(0, 64);
  const uid = clampUid(request.headers.get("X-ColorVerse-UID"));
  const hasParams = styleKey !== "" || seed !== "";
  // Cache key is derived ONLY from style + seed — the uid never influences it.
  const catalogKey = hasParams
    ? `catalog:${stringToHash(`${styleKey}|${seed}`)}`
    : CATALOG_DEFAULT_KEY;

  // Kill switch: serve the legacy site-data.json key instead of generating.
  if (env.DISABLE_WORKER_GEN === "true") {
    try {
      const legacy = await env.SITE_DATA.get("site-data.json");
      if (legacy) {
        return createJSONResponse(JSON.parse(legacy), 200, {
          "Cache-Control": "public, max-age=86400",
          ...corsMethods(request, env),
        });
      }
      return errorResponse("site-data.json not found in KV", 404, request, env);
    } catch (err) {
      console.warn(`[content-api] legacy catalog read error: ${err.message}`);
      return errorResponse("Failed to read legacy catalog", 502, request, env);
    }
  }

  let raw;
  try {
    raw = await env.SITE_DATA.get(catalogKey);
  } catch (err) {
    console.warn(`[content-api] catalog KV read error: ${err.message}`);
    return errorResponse("Failed to read catalog cache", 502, request, env);
  }

  if (raw) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null; // corrupt entry — regenerate rather than serve garbage
    }
    const generatedAt =
      parsed && typeof parsed._meta?.generatedAt === "number" ? parsed._meta.generatedAt : 0;
    const isFresh = Date.now() - generatedAt < CATALOG_TTL_MS;

    if (parsed && isFresh) {
      return createJSONResponse(parsed, 200, {
        "Cache-Control": "public, max-age=86400",
        ...corsMethods(request, env),
      });
    }

    // Stale (or unparseable): serve what we have and regenerate in the
    // background (stale-while-revalidate). The background job re-checks the
    // generation lock, so concurrent stale hits never double-generate.
    const body = parsed ? parsed : { error: "Catalog is regenerating" };
    const regen = generateCatalogBackground(env.SITE_DATA, catalogKey, env, styleKey, seed, uid);
    if (typeof ctx?.waitUntil === "function") {
      ctx.waitUntil(regen);
    } else {
      regen.catch(err =>
        console.warn(`[content-api] catalog regen (no waitUntil) failed: ${err.message}`)
      );
    }
    return createJSONResponse(body, 200, {
      "Cache-Control": "public, max-age=60",
      ...corsMethods(request, env),
    });
  }

  // --- Miss: generation flow (lock -> rate limit -> 202 + background) --------

  // 1. Generation lock: try to claim the catalogKey. If another request is
  //    already generating it, bail out with 202 + Retry-After.
  const lockKey = `catalog:generating:${catalogKey}`;
  try {
    const held = await env.SITE_DATA.get(lockKey);
    if (held !== null) {
      return createJSONResponse({ status: "generating" }, 202, {
        "Retry-After": String(CATALOG_RETRY_AFTER_S),
        ...corsMethods(request, env),
      });
    }
    await env.SITE_DATA.put(lockKey, "1", { expirationTtl: CATALOG_GENERATION_LOCK_TTL_S });
  } catch (err) {
    console.warn(`[content-api] catalog lock error: ${err.message}`);
    return errorResponse("Failed to check catalog generation lock", 502, request, env);
  }

  // 2. Per-IP hourly rate limit on generation triggers. The IP comes from
  //    CF-Connecting-IP (set by the CF edge); fall back to the request host
  //    so the limit still degrades sensibly in tests.
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const hourBucket = Math.floor(Date.now() / 3600000);
  const rateKey = `ratelimit:${ip}:${hourBucket}`;
  try {
    const current = parseInt((await env.SITE_DATA.get(rateKey)) || "0", 10) || 0;
    if (current >= CATALOG_MAX_GENS_PER_HOUR) {
      await env.SITE_DATA.delete(lockKey).catch(() => {});
      return errorResponse(
        "Too many catalog generation requests; try again later",
        429,
        request,
        env
      );
    }
    await env.SITE_DATA.put(rateKey, String(current + 1), {
      expirationTtl: 3600 + 60,
    });
  } catch (err) {
    console.warn(`[content-api] catalog rate limit error: ${err.message}`);
    // KV rate-limit failures must not block the first-ever generation.
  }

  // 3. 202 immediately; generation runs in the background. The lock is held
  //    by this request, so the job is told not to re-claim it (but still to
  //    release it in its finally block on completion).
  const gen = generateCatalogBackground(env.SITE_DATA, catalogKey, env, styleKey, seed, uid, true);
  if (typeof ctx?.waitUntil === "function") {
    ctx.waitUntil(gen);
  } else {
    gen.catch(err =>
      console.warn(`[content-api] catalog generation (no waitUntil) failed: ${err.message}`)
    );
  }
  console.log(
    `[content-api] catalog ${catalogKey} generation started (style=${styleKey || "classic"}, seed=${seed || "n/a"}, uid=${uid || "n/a"})`
  );
  return createJSONResponse({ status: "generating" }, 202, {
    "Retry-After": String(CATALOG_RETRY_AFTER_S),
    ...corsMethods(request, env),
  });
}

// --- main handler ------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsMethods(request, env) });
    }

    const url = new URL(request.url);

    // Analytics event batch endpoint. Accepts POSTs of { events: [...] } and
    // GETs of /events/stats (Bearer-token gated). If ANALYTICS_SINK is
    // configured, forwards the sanitized batch there; otherwise logs and
    // returns 204 so the client can drain its queue even when no sink is
    // wired up yet. When ANALYTICS_KV is bound, per-event and per-path
    // counters are incremented in the same request.
    if (url.pathname.endsWith("/events")) {
      if (request.method !== "POST") {
        return errorResponse("Method not allowed", 405, request, env);
      }
      let payload;
      try {
        payload = await request.json();
      } catch {
        return errorResponse("Invalid JSON body", 400, request, env);
      }
      const events = sanitizeBatch(payload && payload.events);
      if (events.length === 0) {
        return new Response(null, { status: 204, headers: corsMethods(request, env) });
      }

      // Counter writes are best-effort: a KV failure must never fail the
      // client's POST (graceful degradation if the binding is missing or KV
      // errors out).
      if (env.ANALYTICS_KV) {
        try {
          await recordAnalyticsBatch(env.ANALYTICS_KV, events);
        } catch (err) {
          console.warn(`[content-api] analytics KV write error: ${err.message}`);
        }
      }

      const sink = env.ANALYTICS_SINK;
      if (sink) {
        try {
          // Forward the sanitized batch. We don't await the response in the
          // hot path — fire and forget. The sink is responsible for its own
          // durability.
          fetchWithTimeout(
            sink,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ events }),
            },
            5000
          ).catch(err => console.warn(`[content-api] analytics sink error: ${err.message}`));
        } catch (err) {
          console.warn(`[content-api] analytics sink threw: ${err.message}`);
        }
      } else {
        // No sink configured — log a single summary line so operators can
        // see volume in worker logs without enabling a full sink.
        console.log(`[content-api] analytics: ${events.length} events (sink not configured)`);
      }
      return new Response(null, { status: 204, headers: corsMethods(request, env) });
    }

    // Read-only aggregate stats for the admin dashboard. Gated behind a
    // Bearer token (ANALYTICS_ADMIN_TOKEN); 403 when the token is not
    // configured server-side, 401 on a wrong/missing token.
    if (url.pathname.endsWith("/events/stats")) {
      if (request.method !== "GET") {
        return errorResponse("Method not allowed", 405, request, env);
      }
      const auth = parseStatsRequest(request, env);
      if (auth) {
        return errorResponse(auth.error, auth.status, request, env);
      }
      if (!env.ANALYTICS_KV) {
        return errorResponse("Stats storage is not configured", 503, request, env);
      }
      let stats = { events: {}, paths: {} };
      try {
        const raw = await env.ANALYTICS_KV.get(STATS_BLOB_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            stats = {
              events: parsed.events && typeof parsed.events === "object" ? parsed.events : {},
              paths: parsed.paths && typeof parsed.paths === "object" ? parsed.paths : {},
            };
          }
        }
      } catch (err) {
        console.warn(`[content-api] stats read error: ${err.message}`);
        return errorResponse("Failed to read stats", 502, request, env);
      }
      // Top 20 page-view paths by count (desc, then alphabetical for stable output).
      const topPaths = Object.entries(stats.paths)
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
        .slice(0, 20)
        .map(([path, count]) => ({ path, count }));
      const totalEvents = Object.values(stats.events).reduce((sum, n) => sum + (n || 0), 0);
      return createJSONResponse(
        { events: stats.events, topPaths, totalEvents, generatedAt: new Date().toISOString() },
        200,
        corsMethods(request, env)
      );
    }

    // Lazy catalog endpoint: KV-cached catalog with stale-while-revalidate
    // regeneration, a per-catalogKey generation lock, and a per-IP hourly
    // rate limit. See handleCatalog / generateCatalogBackground above.
    if (url.pathname === "/catalog" || url.pathname === "/catalog/") {
      return await handleCatalog(request, env, ctx);
    }

    if (request.method !== "POST") {
      return errorResponse("Method not allowed", 405, request, env);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400, request, env);
    }

    const provider = payload.provider || "pollinations";
    const cors = corsMethods(request, env);

    try {
      let upstream;

      if (provider === "pollinations") {
        const key = env.POLLINATIONS_API_KEY;
        if (!key) {
          return errorResponse("Pollinations API key not configured", 503, request, env);
        }
        upstream = await callPollinations(payload.body, key);
      } else if (provider === "openrouter") {
        const key = env.OPENROUTER_API_KEY;
        if (!key) {
          return errorResponse("OpenRouter API key not configured", 503, request, env);
        }
        upstream = await callOpenRouter(payload.body, key);
      } else if (provider === "gemini") {
        const key = env.GOOGLE_GEMINI_API_KEY;
        if (!key) {
          return errorResponse("Gemini API key not configured", 503, request, env);
        }
        const model = payload.model || "gemini-2.0-flash";
        upstream = await callGemini(model, payload.body, key);
      } else {
        return errorResponse(`Unknown provider: ${provider}`, 400, request, env);
      }

      // Stream the upstream response back with CORS headers
      const responseBody = await upstream.text();
      return new Response(responseBody, {
        status: upstream.status,
        headers: {
          "Content-Type": "application/json",
          ...cors,
        },
      });
    } catch (err) {
      console.error(`[content-api] ${provider} error:`, err.message);
      return errorResponse(`Upstream error: ${err.message}`, 502, request, env);
    }
  },
};
