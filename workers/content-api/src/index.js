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
 */

import { createJSONResponse, fetchWithTimeout } from "../../shared/utils.js";

const POLLINATIONS_URL = "https://gen.pollinations.ai/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const ALLOWED_ANALYTICS_EVENTS = new Set([
  "page_view",
  "print",
  "download",
  "favorite_add",
  "favorite_remove",
]);
const MAX_EVENTS_PER_BATCH = 100;
const MAX_EVENT_PROP_BYTES = 512;

// --- helpers -----------------------------------------------------------------

function corsHeaders(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || "*").split(",").map(s => s.trim());
  const origin = request.headers.get("Origin") || "*";
  const allowOrigin = allowed.includes("*") ? "*" : allowed.includes(origin) ? origin : allowed[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
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
  return createJSONResponse({ error: message }, status, corsHeaders(request, env));
}

// --- provider callers --------------------------------------------------------

async function callPollinations(body, apiKey) {
  return fetchWithTimeout(POLLINATIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
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

// --- main handler ------------------------------------------------------------

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);

    // Analytics event batch endpoint. Accepts POSTs of { events: [...] }.
    // If ANALYTICS_SINK is configured, forwards the sanitized batch there;
    // otherwise logs and returns 204 so the client can drain its queue
    // even when no sink is wired up yet.
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
        return new Response(null, { status: 204, headers: corsHeaders(request, env) });
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
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
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
    const cors = corsHeaders(request, env);

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
