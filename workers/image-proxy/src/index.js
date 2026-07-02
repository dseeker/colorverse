/**
 * ColorVerse Image Proxy Worker
 * Proxies image generation requests to Pollinations so the API key
 * never reaches the client. Also adds cache headers.
 *
 * Environment variables (set via wrangler.toml / CF dashboard):
 *   POLLINATIONS_API_KEY
 *   ALLOWED_ORIGINS  (comma-separated, default "*")
 */

import { POLLINATIONS_CONFIG, PLACEHOLDER_SVG, ERROR_SVG } from "../../shared/constants.js";
import { fetchWithTimeout } from "../../shared/utils.js";

const IMAGE_CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

function corsHeaders(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || "*").split(",").map(s => s.trim());
  const origin = request.headers.get("Origin") || "*";
  const allowOrigin = allowed.includes("*") ? "*" : allowed.includes(origin) ? origin : allowed[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function svgResponse(svg, status, cors) {
  return new Response(svg, {
    status,
    headers: { "Content-Type": "image/svg+xml", ...cors },
  });
}

export default {
  async fetch(request, env, ctx) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (request.method !== "GET") {
      return svgResponse(ERROR_SVG, 405, corsHeaders(request, env));
    }

    const url = new URL(request.url);
    const prompt = url.searchParams.get("prompt");
    if (!prompt) {
      return svgResponse(ERROR_SVG, 400, corsHeaders(request, env));
    }

    const apiKey = env.POLLINATIONS_API_KEY;
    if (!apiKey) {
      return svgResponse(ERROR_SVG, 503, corsHeaders(request, env));
    }

    // Build upstream Pollinations image URL
    const params = new URLSearchParams({
      width: url.searchParams.get("width") || "1024",
      height: url.searchParams.get("height") || "1024",
      seed: url.searchParams.get("seed") || String(Math.floor(Math.random() * 100000)),
      nologo: "true",
      referrer: "dseeker.github.io",
      model: url.searchParams.get("model") || POLLINATIONS_CONFIG.DEFAULT_MODEL,
      key: apiKey,
      enhance: url.searchParams.get("enhance") || "true",
      quality: url.searchParams.get("quality") || "medium",
    });

    const upstreamUrl = `${POLLINATIONS_CONFIG.IMAGE_BASE_URL}/${encodeURIComponent(prompt)}?${params}`;
    const cors = corsHeaders(request, env);

    // Check CF cache first
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: { ...Object.fromEntries(cachedResponse.headers), ...cors },
      });
    }

    try {
      const upstream = await fetchWithTimeout(upstreamUrl, {}, 60000);

      if (!upstream.ok) {
        console.error(
          `[image-proxy] Upstream ${upstream.status}: ${upstreamUrl.substring(0, 120)}`
        );
        return svgResponse(ERROR_SVG, upstream.status, cors);
      }

      const contentType = upstream.headers.get("Content-Type") || "image/jpeg";
      const body = await upstream.arrayBuffer();

      const response = new Response(body, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": `public, max-age=${IMAGE_CACHE_TTL}`,
          ...cors,
        },
      });

      // Store in CF cache (non-blocking)
      ctx.waitUntil(cache.put(cacheKey, response.clone()));

      return response;
    } catch (err) {
      console.error("[image-proxy] fetch error:", err.message);
      return svgResponse(ERROR_SVG, 502, cors);
    }
  },
};
