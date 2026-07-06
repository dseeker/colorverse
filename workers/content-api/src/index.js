/**
 * ColorVerse Content API Worker
 * Proxies AI text generation requests so API keys stay server-side.
 *
 * Environment variables (set via wrangler.toml / CF dashboard):
 *   POLLINATIONS_API_KEY
 *   OPENROUTER_API_KEY
 *   GOOGLE_GEMINI_API_KEY
 *   ALLOWED_ORIGINS  (comma-separated, default "*")
 */

import { createJSONResponse, fetchWithTimeout } from "../../shared/utils.js";

const POLLINATIONS_URL = "https://gen.pollinations.ai/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

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
