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
// Lock TTL matches the CF waitUntil wall-clock limit (~30s). If the lock
// expires, the generation died (waitUntil was killed) and the next request
// retries. A longer TTL would block retries for minutes after a killed job.
const CATALOG_GENERATION_LOCK_TTL_S = 30;
const CATALOG_MAX_GENS_PER_HOUR = 5;
const CATALOG_RETRY_AFTER_S = 10;
const CATALOG_ITEMS_PER_CATEGORY = 20;
const CATALOG_SEASONAL_ITEMS = 12;
// Generous per-category timeout: the catalog is regenerated in the
// background, so a slow response is better than a partial catalog.
const CATALOG_ITEM_TIMEOUT_MS = 60000;
const CATALOG_DELAY_BETWEEN_CATEGORIES_MS = 1500;

// --- Hybrid/resilient generation constants -----------------------------------
// Wall-clock deadline for the parallel strategy (buffer under paid tier's 30s).
const CATALOG_GEN_DEADLINE_MS = 25000;
// 0 = fire all 26 at once via Promise.allSettled. If >0, chunk into batches
// of that size (useful if Pollinations struggles with many concurrent calls).
const CATALOG_PARALLEL_BATCH_SIZE = 0;
// Categories to generate per chain-mode poll cycle.
const CATALOG_CHAIN_BATCH_SIZE = 5;
// Wall-clock budget for a single chain batch (each batch runs in its own
// waitUntil, so it gets its own deadline — separate from the parallel
// strategy's CATALOG_GEN_DEADLINE_MS). Picked to stay under CF's 30s limit.
const CATALOG_CHAIN_BATCH_DEADLINE_MS = 25000;
// Partial catalog staleness threshold — if a partial is older than this,
// discard it and start fresh.
const CATALOG_PARTIAL_TTL_MS = 600000; // 10 minutes
// After this many consecutive generation failures, serve legacy site-data.json.
const CATALOG_MAX_FAILS = 3;
// Text-generation model names (one per provider, used by generateCatalogTextWithFallback).
const CATALOG_TEXT_MODEL_POLLINATIONS = "openai";
const CATALOG_TEXT_MODEL_OPENROUTER = "openai/gpt-4.1-nano";
const CATALOG_TEXT_MODEL_GEMINI = "gemini-2.0-flash";

/**
 * Create a wall-clock deadline tracker.
 * @param {number} ms — duration in milliseconds
 * @returns {{ remaining: () => number, expired: () => boolean, deadline: number }}
 */
function makeDeadline(ms) {
  const deadline = Date.now() + ms;
  return {
    remaining: () => Math.max(0, deadline - Date.now()),
    expired: () => Date.now() >= deadline,
    get deadline() {
      return deadline;
    },
  };
}

/**
 * Try Pollinations, then OpenRouter, then Gemini. Each provider catches
 * its own errors and falls through; only when ALL are exhausted does it throw.
 *
 * Returns a parsed JSON object (the catalog category data).
 *
 * @param {string} prompt
 * @param {{ [key: string]: string }} env
 * @param {string} [systemMessage]
 * @returns {Promise<object>}
 */
async function generateCatalogTextWithFallback(prompt, env, systemMessage) {
  // --- 1. Pollinations ---------------------------------------------------
  try {
    const pollBody = {
      model: CATALOG_TEXT_MODEL_POLLINATIONS,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    };
    const pollRes = await callPollinations(
      pollBody,
      env.POLLINATIONS_API_KEY,
      CATALOG_ITEM_TIMEOUT_MS
    );
    if (pollRes.status === 402) {
      throw new Error("PROVIDER_402");
    }
    if (!pollRes.ok) {
      const text = await pollRes.text().catch(() => "");
      throw new Error(`Pollinations ${pollRes.status}: ${text.substring(0, 200)}`);
    }
    const pollData = await pollRes.json();
    const content = pollData?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty Pollinations response");
    }
    return JSON.parse(content);
  } catch (err) {
    if (err.message === "PROVIDER_402") {
      throw err;
    }
    console.warn(
      `[content-api] catalog text Pollinations failed, trying OpenRouter: ${err.message}`
    );
  }

  // --- 2. OpenRouter -----------------------------------------------------
  try {
    if (!env.OPENROUTER_API_KEY) {
      throw new Error("OpenRouter key not set");
    }
    const orBody = {
      model: CATALOG_TEXT_MODEL_OPENROUTER,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    };
    const orRes = await callOpenRouter(orBody, env.OPENROUTER_API_KEY);
    if (orRes.status === 402 || orRes.status === 401) {
      throw new Error("PROVIDER_402");
    }
    if (!orRes.ok) {
      const text = await orRes.text().catch(() => "");
      throw new Error(`OpenRouter ${orRes.status}: ${text.substring(0, 200)}`);
    }
    const orData = await orRes.json();
    const content = orData?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty OpenRouter response");
    }
    return JSON.parse(content);
  } catch (err) {
    if (err.message === "PROVIDER_402") {
      throw err;
    }
    console.warn(`[content-api] catalog text OpenRouter failed, trying Gemini: ${err.message}`);
  }

  // --- 3. Gemini ---------------------------------------------------------
  try {
    if (!env.GOOGLE_GEMINI_API_KEY) {
      throw new Error("Gemini key not set");
    }
    const gemBody = {
      contents: [
        {
          parts: [{ text: prompt }, ...(systemMessage ? [{ text: systemMessage }] : [])],
        },
      ],
      generationConfig: { response_mime_type: "application/json" },
    };
    const gemRes = await callGemini(CATALOG_TEXT_MODEL_GEMINI, gemBody, env.GOOGLE_GEMINI_API_KEY);
    if (!gemRes.ok) {
      const text = await gemRes.text().catch(() => "");
      throw new Error(`Gemini ${gemRes.status}: ${text.substring(0, 200)}`);
    }
    const gemData = await gemRes.json();
    // Gemini returns { candidates: [{ content: { parts: [{ text }] }}] }
    const content = gemData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error("Empty Gemini response");
    }
    return JSON.parse(content);
  } catch (err) {
    throw new Error(
      `All text providers exhausted: Pollinations, OpenRouter, Gemini — ${err.message}`
    );
  }
}

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
      model: "openai",
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

// --- Parallel generation (Strategy 1) ----------------------------------------

/**
 * Build all 26 category/gallery prompts, fire them via Promise.allSettled,
 * collect results and write the final catalog to KV.
 *
 * If CATALOG_PARALLEL_BATCH_SIZE > 0 the calls are split into sequential
 * chunks of that size (useful when Pollinations struggles with 26
 * concurrent requests).
 *
 * Returns { success: true/false, keepLock: true } when ≥50% calls were
 * 402 (balance exhausted) — caller keeps the lock so the next request
 * retries after recovery.
 */
async function generateCatalogParallel(kv, catalogKey, env, styleKey, seed, deadline) {
  const style = COLORING_STYLES[styleKey];
  const styleSuffix = style && style.prompt ? style.prompt : undefined;
  const systemMessage = buildCatalogSystemMessage(styleSuffix);

  const categoryKeys = Object.keys(CATEGORIES);
  const totalExpected = categoryKeys.length + 1; // 25 categories + seasonal

  // Build a category prompt call (returns categoryKey → data).
  function makeCategoryCall(key, info) {
    return generateCatalogTextWithFallback(
      buildCategoryPrompt(key, info, CATALOG_ITEMS_PER_CATEGORY, seed),
      env,
      systemMessage
    ).then(
      data => (data && typeof data === "object" ? data : { ...info, items: {} }),
      err => {
        throw err; // rejections tracked via allSettled
      }
    );
  }

  // Build a seasonal gallery call.
  function makeSeasonalCall() {
    const season = getCurrentSeason();
    return generateCatalogTextWithFallback(buildSeasonalPrompt(season), env, systemMessage).then(
      data => (data && typeof data === "object" ? data : { items: {} }),
      err => {
        throw err;
      }
    );
  }

  const calls = [];
  for (const key of categoryKeys) {
    calls.push({ type: "category", key, promise: makeCategoryCall(key, CATEGORIES[key]) });
  }
  calls.push({ type: "seasonal", promise: makeSeasonalCall() });

  // If batching, split into chunks and process sequentially.
  const rawBatch = Number(env.CATALOG_PARALLEL_BATCH);
  const batchSize =
    Number.isFinite(rawBatch) && rawBatch > 0 ? rawBatch : CATALOG_PARALLEL_BATCH_SIZE;
  const batches =
    batchSize > 0
      ? Array.from({ length: Math.ceil(calls.length / batchSize) }, (_, i) =>
          calls.slice(i * batchSize, (i + 1) * batchSize)
        )
      : [calls];

  // Analyse results: count 402s, collect fulfilled values.
  let provider402Count = 0;
  const categories = {};
  let seasonalGallery = null;
  let seasonalHasResult = false;

  for (const batch of batches) {
    if (deadline.expired()) {
      break;
    }

    // Fire all calls in this batch concurrently.
    const results = await Promise.allSettled(batch.map(entry => entry.promise));

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const entry = batch[i];

      if (r.status === "fulfilled") {
        if (entry.type === "category") {
          categories[entry.key] = r.value;
        } else {
          seasonalGallery = r.value;
          seasonalHasResult = true;
        }
      } else {
        const msg = (r.reason && r.reason.message) || "";
        if (msg === "PROVIDER_402") {
          provider402Count++;
          // On 402, do NOT add a fallback — leave missing to be filled later.
          if (entry.type === "category") {
            console.warn(`[content-api] parallel category ${entry.key}: 402, will use fallback`);
          }
        } else {
          // Non-402 error: use fallback.
          if (entry.type === "category") {
            categories[entry.key] = { ...CATEGORIES[entry.key], items: {} };
          } else {
            seasonalGallery = { items: {} };
            seasonalHasResult = true;
          }
        }
      }
    }
  }

  const season = getCurrentSeason();
  const seasonFallback = {
    title: `${season} Collection`,
    subtitle: "Seasonal coloring pages",
    items: {},
  };

  // 402 exhaustion check: ≥50% of all 26 calls are 402.
  if (provider402Count >= Math.ceil(totalExpected / 2)) {
    return { success: false, keepLock: true };
  }

  // Fill missing categories with fallbacks.
  for (const key of categoryKeys) {
    if (!categories[key]) {
      categories[key] = { ...CATEGORIES[key], items: {} };
    }
  }
  // Fill missing seasonal.
  if (!seasonalHasResult) {
    seasonalGallery = seasonFallback;
  }

  // If the deadline has already expired (no calls were made), do NOT write
  // an empty/fallback catalog — the orchestrator should switch to chain mode.
  if (deadline.expired()) {
    return { success: false, keepLock: false };
  }

  // Assemble the final catalog.
  const catalog = {
    brand: { name: "ColorVerse", tagline: "Free AI-Generated Coloring Pages" },
    seasonal_gallery: seasonalGallery,
    categories,
    _meta: {
      generatedAt: Date.now(),
      totalItems: countCatalogItems({ categories }),
      categoryCount: Object.keys(categories).length,
      season,
      style: styleKey || "classic",
      seed: seed || null,
      generatedBy: "anonymous",
    },
  };
  await kv.put(catalogKey, JSON.stringify(catalog));
  console.log(
    `[content-api] parallel catalog ${catalogKey} written (${catalog._meta.totalItems} items)`
  );
  return { success: true, keepLock: false };
}

// --- Chained generation (Strategy 2) -----------------------------------------

/**
 * Incrementally generate a catalog across multiple poll cycles.
 *
 * On first call (partial === null) initialises the partial state in KV.
 * Each subsequent call advances the chain by CATALOG_CHAIN_BATCH_SIZE
 * categories, writes the updated partial back, and returns { success }.
 *
 * When all categories + seasonal are done, writes the final catalog to
 * catalogKey, deletes the partial, and returns { success: true }.
 */
async function generateCatalogChained(kv, catalogKey, env, styleKey, seed, partial, deadline) {
  const categoryKeys = Object.keys(CATEGORIES);
  const season = getCurrentSeason();
  const seasonKey = "__seasonal__";
  const partialKey = `catalog:partial:${catalogKey}`;

  // Each chain batch runs in its own waitUntil and gets a fresh deadline —
  // the orchestrator passes an already-expired deadline when entering chain
  // mode from a timed-out parallel attempt, but the chain batch itself needs
  // its own wall-clock budget to actually generate categories. Use a fixed
  // per-batch deadline so a CATALOG_GEN_DEADLINE_MS=0 (used to force chain
  // mode in tests / free-tier simulation) doesn't starve the chain too.
  if (!deadline || deadline.expired()) {
    deadline = makeDeadline(CATALOG_CHAIN_BATCH_DEADLINE_MS);
  }

  if (!partial) {
    // Fresh start — initialise partial state.
    partial = {
      categories: {},
      completedKeys: [],
      remainingKeys: [...categoryKeys],
      seasonalDone: false,
      startedAt: Date.now(),
      styleKey,
      seed,
    };
    await kv.put(partialKey, JSON.stringify(partial), { expirationTtl: 300 });
    console.log(`[content-api] chain mode started for ${catalogKey}`);
  }

  const style = COLORING_STYLES[styleKey];
  const styleSuffix = style && style.prompt ? style.prompt : undefined;
  const systemMessage = buildCatalogSystemMessage(styleSuffix);

  // Generate next batch.
  const batchSize = Number(env.CATALOG_CHAIN_BATCH) || CATALOG_CHAIN_BATCH_SIZE;
  const keysToGen = partial.remainingKeys.splice(0, batchSize);

  for (const key of keysToGen) {
    if (deadline.expired()) {
      break;
    }
    const prompt = buildCategoryPrompt(key, CATEGORIES[key], CATALOG_ITEMS_PER_CATEGORY, seed);
    try {
      const data = await generateCatalogTextWithFallback(prompt, env, systemMessage);
      partial.categories[key] =
        data && typeof data === "object" ? data : { ...CATEGORIES[key], items: {} };
    } catch (err) {
      if (err.message === "PROVIDER_402") {
        // Stop the batch on 402 — return and let the orchestrator handle it.
        console.warn(`[content-api] chain 402 for ${catalogKey}/${key}; pausing chain`);
        return { success: false, keepLock: true };
      }
      console.warn(`[content-api] chain ${key} failed: ${err.message}; using fallback`);
      partial.categories[key] = { ...CATEGORIES[key], items: {} };
    }
    partial.completedKeys.push(key);
  }

  // Check if we've finished all categories — generate seasonal if needed.
  if (partial.remainingKeys.length === 0 && !partial.seasonalDone) {
    if (!deadline.expired()) {
      try {
        const seasonalData = await generateCatalogTextWithFallback(
          buildSeasonalPrompt(season),
          env,
          systemMessage
        );
        partial.categories[seasonKey] =
          seasonalData && typeof seasonalData === "object" ? seasonalData : { items: {} };
        partial.seasonalDone = true;
      } catch (err) {
        if (err.message === "PROVIDER_402") {
          console.warn(`[content-api] chain seasonal 402 for ${catalogKey}; pausing chain`);
          return { success: false, keepLock: true };
        }
        console.warn(`[content-api] chain seasonal failed: ${err.message}; using fallback`);
        partial.categories[seasonKey] = {
          title: `${season} Collection`,
          subtitle: "Seasonal coloring pages",
          items: {},
        };
        partial.seasonalDone = true;
      }
    }
  }

  // Check if complete: all categories done AND seasonal done.
  if (partial.remainingKeys.length === 0 && partial.seasonalDone) {
    // Assemble final catalog.
    const catalog = {
      brand: { name: "ColorVerse", tagline: "Free AI-Generated Coloring Pages" },
      seasonal_gallery: partial.categories[seasonKey] || { items: {} },
      categories: partial.categories,
      _meta: {
        generatedAt: Date.now(),
        totalItems: countCatalogItems({ categories: partial.categories }),
        categoryCount: categoryKeys.length,
        season,
        style: styleKey || "classic",
        seed: seed || null,
        generatedBy: "anonymous",
      },
    };
    await kv.put(catalogKey, JSON.stringify(catalog));
    await kv.delete(partialKey).catch(() => {});
    console.log(
      `[content-api] chain catalog ${catalogKey} completed (${catalog._meta.totalItems} items)`
    );
    return { success: true, keepLock: false };
  }

  // Not done yet — save partial and continue next poll.
  await kv.put(partialKey, JSON.stringify(partial), { expirationTtl: 300 });
  return { success: false, keepLock: false };
}

/**
 * Orchestrator: tries Strategy 1 (parallel), falls back to Strategy 2
 * (chain) when the deadline expires, and uses Strategy 3 (legacy) when
 * consecutive failures exceed CATALOG_MAX_FAILS.
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
  let keepLock = false;
  let failCount = 0;

  try {
    // --- failcount check (Strategy 3) -------------------------------------
    const maxFails = Number(env.CATALOG_MAX_FAILS) || CATALOG_MAX_FAILS;
    const failCountRaw = await kv.get(`catalog:failcount:${catalogKey}`);
    failCount = parseInt(failCountRaw || "0", 10);
    if (failCount >= maxFails) {
      console.log(
        `[content-api] catalog ${catalogKey} failcount=${failCount} >= ${maxFails}; skipping generation`
      );
      return;
    }

    // --- deadline ---------------------------------------------------------
    const rawDeadline = Number(env.CATALOG_GEN_DEADLINE_MS);
    const deadlineMs = Number.isFinite(rawDeadline) ? rawDeadline : CATALOG_GEN_DEADLINE_MS;
    const deadline = makeDeadline(deadlineMs);

    // --- lock management --------------------------------------------------
    if (!lockHeld) {
      const held = await kv.get(lockKey);
      if (held !== null) {
        return; // someone else is already regenerating
      }
      await kv.put(lockKey, "1", { expirationTtl: CATALOG_GENERATION_LOCK_TTL_S });
      acquired = true;
    }

    // --- check for existing partial (Strategy 2 resume) -------------------
    const partialKey = `catalog:partial:${catalogKey}`;
    const partialRaw = await kv.get(partialKey);
    if (partialRaw) {
      let parsed;
      try {
        parsed = JSON.parse(partialRaw);
        if (parsed && Date.now() - parsed.startedAt < CATALOG_PARTIAL_TTL_MS) {
          // Resume chain from existing partial.
          console.log(`[content-api] resuming chain for ${catalogKey}`);
          await generateCatalogChained(kv, catalogKey, env, styleKey, seed, parsed, deadline);
          return;
        }
      } catch {
        // corrupt partial — fall through.
      }
      // Stale or corrupt partial — discard.
      await kv.delete(partialKey).catch(() => {});
    }

    // --- Strategy 1: Parallel ---------------------------------------------
    const parallelResult = await generateCatalogParallel(
      kv,
      catalogKey,
      env,
      styleKey,
      seed,
      deadline
    );

    if (parallelResult.success) {
      // Success — reset failcount.
      await kv.delete(`catalog:failcount:${catalogKey}`).catch(() => {});
      return;
    }

    if (parallelResult.keepLock) {
      // ≥50% 402 — keep lock and increment failcount.
      keepLock = true;
      await kv
        .put(`catalog:failcount:${catalogKey}`, String(failCount + 1), { expirationTtl: 3600 })
        .catch(() => {});
      console.error(
        `[content-api] catalog 402 exhaustion for ${catalogKey}; failcount=${failCount + 1}`
      );
      return;
    }

    // Parallel failed (deadline expired or partial write). Fall back to chain.
    if (deadline.expired()) {
      console.log(`[content-api] parallel deadline expired for ${catalogKey}; starting chain mode`);
      await generateCatalogChained(kv, catalogKey, env, styleKey, seed, null, deadline);
      return;
    }

    // Other failure — increment failcount.
    await kv
      .put(`catalog:failcount:${catalogKey}`, String(failCount + 1), { expirationTtl: 3600 })
      .catch(() => {});
  } catch (err) {
    if (
      err.message &&
      (err.message.includes("PROVIDER_402") || err.message.includes("PROVIDER_402"))
    ) {
      keepLock = true;
      await kv
        .put(`catalog:failcount:${catalogKey}`, String(failCount + 1), { expirationTtl: 3600 })
        .catch(() => {});
      console.error(
        `[content-api] catalog 402 for ${catalogKey}; failcount incremented to ${failCount + 1}`
      );
    } else {
      console.error(`[content-api] catalog generation for ${catalogKey} crashed: ${err.message}`);
    }
  } finally {
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

  // --- Miss: generation flow (failcount -> lock -> rate limit -> 202 + background) ---

  // 0. Failcount kill-switch: if generation has failed too many times,
  //    serve the legacy catalog instead (same as DISABLE_WORKER_GEN).
  try {
    const fcRaw = await env.SITE_DATA.get(`catalog:failcount:${catalogKey}`);
    const maxFails = Number(env.CATALOG_MAX_FAILS) || CATALOG_MAX_FAILS;
    if (parseInt(fcRaw || "0", 10) >= maxFails) {
      const legacy = await env.SITE_DATA.get("site-data.json");
      if (legacy) {
        return createJSONResponse(JSON.parse(legacy), 200, {
          "Cache-Control": "public, max-age=86400",
          ...corsMethods(request, env),
        });
      }
      return errorResponse("site-data.json not found in KV", 404, request, env);
    }
  } catch (err) {
    console.warn(`[content-api] failcount read error: ${err.message}`);
  }

  // 1. Generation lock: try to claim the catalogKey. If another request is
  //    already generating it, check for a partial and potentially resume
  //    the chain in this request's waitUntil.
  const lockKey = `catalog:generating:${catalogKey}`;
  try {
    const held = await env.SITE_DATA.get(lockKey);
    if (held !== null) {
      // Check for a fresh partial — if it exists, this request can continue
      // the chain rather than just bailing with 202.
      const partialKey = `catalog:partial:${catalogKey}`;
      const partialRaw = await env.SITE_DATA.get(partialKey);
      if (partialRaw) {
        let parsed;
        try {
          parsed = JSON.parse(partialRaw);
        } catch {
          parsed = null;
        }
        if (parsed && Date.now() - parsed.startedAt < CATALOG_PARTIAL_TTL_MS) {
          // Delete the lock — chain mode uses the partial as the coordinator.
          await env.SITE_DATA.delete(lockKey).catch(() => {});
          // Continue the chain in this request.
          const gen = generateCatalogChained(
            env.SITE_DATA,
            catalogKey,
            env,
            styleKey,
            seed,
            parsed,
            null // chain creates its own fresh deadline per batch
          );
          if (typeof ctx?.waitUntil === "function") {
            ctx.waitUntil(gen);
          } else {
            gen.catch(err =>
              console.warn(`[content-api] chain resume (no waitUntil) failed: ${err.message}`)
            );
          }
          return createJSONResponse({ status: "generating" }, 202, {
            "Retry-After": String(CATALOG_RETRY_AFTER_S),
            ...corsMethods(request, env),
          });
        }
      }
      // No fresh partial — bail with 202.
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
