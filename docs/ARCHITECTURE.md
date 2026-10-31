# Architecture

ColorVerse is a vanilla-JS PWA — no framework or required app build step. The site has a
large `src/app.js` entry point plus "manager" services loaded by the browser, backed by two
Cloudflare Workers for server-side API access.

See [README.md](../README.md) for the project overview and
[DEVELOPMENT.md](./DEVELOPMENT.md) for the dev workflow.

## System overview

```
                +-------------------------------------------+
                |                Browser (client)           |
                |                                           |
                |  index.html -> src/app.js (routing, render)|
                |  window._env config  +  src/services/*    |
                +-----+----------------+----------------+---+
                      |                |                |
              GET /data        POST /events     GET /image?prompt=...
                      |          /events/stats        |
                      v                |               v
        +-----------------+    +------------------+    +-----------------+
        | image-proxy     |    | content-api      |    | image-proxy     |
        | (CF Worker)     |    | (CF Worker)      |    | (CF Worker)     |
        | - /data (KV)    |    | - POST text gen  |    | - image gen     |
        | - image proxy   |    | - /events POST   |    |   (CF cache,    |
        +--------+--------+    | - /events/stats  |    |   7-day TTL)    |
                 |             +--------+---------+    +--------+--------+
                 |                      |                       |
                 v                      v                       v
          Cloudflare KV          (optional) ANALYTICS_SINK   Pollinations.ai
          (site-data.json)       + ANALYTICS_KV counters     gen.pollinations.ai
```

Keys never reach the browser: `POLLINATIONS_API_KEY` (and the OpenRouter/Gemini keys)
live in the workers' wrangler secrets. The browser only ever talks to the workers and
(when analytics is on) the worker's `/events` route.

## The service-manager pattern

`src/services/*.js` files are loaded by `<script>` tags in `index.html`
and each attaches a singleton to `window`:

| File                        | Window global                   | Purpose                                                          |
| --------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| `seoManager.js`             | `window.SEOManager`             | Meta tags, JSON-LD, sitemap generation                           |
| `analyticsManager.js`       | `window.analytics`              | Privacy-first event batching                                     |
| `favoritesManager.js`       | `window.FavoritesManager`       | localStorage favorites + view                                    |
| `searchManager.js`          | `window.SearchManager`          | Search index + results page (loaded as a `type="module"` script) |
| `coloringTipsManager.js`    | `window.ColoringTipsManager`    | Static tips content                                              |
| `performanceMonitor.js`     | `window.PerformanceMonitor`     | Core Web Vitals collection                                       |
| `imageLoader.js`            | `window.OptimizedImageLoader`   | IntersectionObserver lazy loading                                |
| `cacheManager.js`           | `window.CacheManager`           | LRU cache + IndexedDB fallback                                   |
| `palettesManager.js`        | `window.PalettesManager`        | Palette browsing overlay modal + localStorage favorites          |
| `MultiProviderAIManager.js` | `window.MultiProviderAIManager` | Provider/model fallback + backoff                                |

Two subtleties:

- Most of these files also end with an `export default` for Vitest. Files that are loaded
  as **classic** scripts can't contain `export` (it's a SyntaxError), so the ones that
  need it are loaded with `type="module"` — deferred, so they still run before `src/app.js`'s
  `DOMContentLoaded` handler.
- `src/modules/aiProviders.js` is loaded as a classic script before `src/app.js` and defines
  the cross-file globals (`callAIAPI`, `AI_PROVIDERS`, ...) that `src/app.js` and the
  services rely on — ESLint declares these in `eslint.config.js`.
- `archive/openrouter.js` is a legacy standalone helper, not part of the browser load order.

Services with unit tests live in `tests/unit/services/`
(`favoritesManager.test.ts`, `searchManager.test.ts`, `cacheManager.test.ts`).

## Routing

Hash-based, dispatched by `handleRouteChange()` in `src/app.js`, wired to `hashchange`:

- `#` / `#/` — homepage
- `#category/<key>?page=N&sort=...` — category listing (progressive loading)
- `#item/<style>/<category>/<item>?t=<base64>&d=<base64>&cat=<base64>` — item detail
  - 3-segment path: style is always included (e.g. `classic`, `futuristic`, `painted`).
  - Query params `t` (title), `d` (description), `cat` (category label) are base64-encoded
    snapshots so the item view can render without a round-trip to site data.
  - Legacy 2-segment URLs (`#item/<category>/<item>?style=<style>`) are detected by
    `parseItemHash()` and normalized via `history.replaceState` to the 3-segment format.
- `#palettes` / `#palette/<id>` — open the palettes overlay modal (backward-compat;
  the hash is cleared after opening, user stays on their current page)
- `#about`, `#privacy`, `#terms`, `#contact` — static pages
- `#daily-pick`, `#all-categories`, `#favorites`, `#donate` — feature pages
- `#search` / `#search?q=term` — search results
- `#dashboard` — admin-only analytics dashboard (intentionally not in the nav;
  Bearer-token gated)

Flow per navigation (all inside one `try/catch/finally`):

1. `trackPageView(hash)` fires at the top of the try block — a no-op when
   analytics is disabled.
2. The matching `renderXxx()` builds an HTML string, assigned to
   `mainContent.innerHTML` (see `renderHomepage()`, `renderCategory()`,
   `renderItem()`, and `renderSearchPage()` in `src/app.js`).
3. `updateSEO({...})` updates meta tags + JSON-LD via `window.SEOManager`.
4. `finally`: hide loading, scroll to top, `setupLazyLoading()` for images.

## Palettes overlay modal

Palettes are shown as an overlay modal (`#palettes-overlay`) rather than a full-page
route, so users stay on whatever page they're on when they open it. The nav button
calls `window.PalettesManager.openPalettesOverlay()` directly — no hash change, no
navigation. The overlay supports:

- Browse grid: all palette cards with color swatches.
- Detail view: large swatches + hex codes, swapped in-place via `openPaletteDetail()`.
- Close: backdrop click, × button, or Escape key — all call `closePalettesOverlay()`.
- Body scroll is locked while open and restored on close.

The legacy `#palettes` and `#palette/<id>` routes still work (they call the overlay
methods and clear the hash) so old shared links don't break.

## Data flow

- **Site data:** in static mode (`window.__COLORVERSE_STATIC__ = true`
  in `index.html`), `generateSiteData()` in `src/app.js` fetches `site-data.json`
  from the configured data URL. The image-proxy worker's `/data` route reads it
  from a KV binding and caches the response in CF Cache API with per-request CORS
  (see `workers/image-proxy/src/index.js`).
- **Images:** `getImageUrl()` in `src/app.js` builds the coloring prompt and, when
  `IMAGE_PROXY_URL` is set, returns a URL through the image-proxy worker
  via `IMAGE_PROXY_URL`. The worker appends `key=<POLLINATIONS_API_KEY>` server-side,
  serves from CF cache (7-day TTL), and returns placeholder/error SVGs on failure.
- **Text generation (live mode):** `callAIAPI()` in `src/modules/aiProviders.js` routes
  through `CONTENT_API_URL` (the content-api worker) when set, with model-level fallback;
  otherwise it calls providers directly.

## Cloudflare Workers

Both workers live under `workers/`, share helpers in `workers/shared/`
(`constants.js`, `utils.js`), and are deployed by `.github/workflows/deploy-workers.yml`
(wrangler, Node 22) on changes to `workers/**`.

### `workers/content-api` (`workers/content-api/src/index.js`)

- **`GET /catalog`** — Hybrid catalog generation (25 categories + 1 seasonal). Three
  strategies, each triggered by the previous one's outcome:
  1. **Parallel**: fires all 26 LLM calls via `Promise.race` against a 25s deadline
     (`CATALOG_GEN_DEADLINE_MS`). Collects partial results on timeout; writes full catalog
     to KV (`catalog:{hash}`). If ≥50% return 402, keeps lock + increments failcount.
  2. **Chain**: triggered when parallel yields zero results. Generates 5 categories per
     poll cycle (`CATALOG_CHAIN_BATCH_SIZE`), storing partial progress in
     `catalog:partial:{hash}`. Next poll continues from the last completed batch.
  3. **Legacy fallback**: served when failcount ≥ 3 (`CATALOG_MAX_FAILS`); returns the
     stale `site-data.json` from KV with a 1h auto-recovery window.
- **Provider fallback**: `Pollinations` (openai model) → `OpenRouter` (`openai/gpt-4.1-nano`)
  → `Gemini` (`gemini-2.0-flash`). All three keys are CF Worker secrets.
- **Locking**: `catalog:generating:{hash}` KV key with a 30s TTL (`CATALOG_GENERATION_LOCK_TTL_S`)
  prevents concurrent generation runs. Lock check is resilient to KV errors.
  Failure tracking uses `catalog:failcount:{hash}`. Rate limiting uses
  `ratelimit:{ip}:{hour}`.
- **`POST /`** — AI text generation proxy. Dispatches on `payload.provider`
  (`pollinations` / `openrouter` / `gemini`) and injects the matching secret. Keys are set
  via `npx wrangler secret put` (see the comments in `wrangler.toml`); `ALLOWED_ORIGINS`
  is a plain var.
- **`POST /events`** — analytics batch endpoint. Re-validates the client's batch against
  the server-side `ALLOWED_ANALYTICS_EVENTS` allowlist, caps batch size at 100
  events and each prop at 512 bytes, increments counters in the `ANALYTICS_KV` namespace
  (single JSON blob; read-modify-write races are acceptable for aggregate stats), and
  optionally forwards to `ANALYTICS_SINK`.
- **`GET /events/stats`** — aggregate counters for the `#dashboard` route. Gated by
  `Authorization: Bearer <ANALYTICS_ADMIN_TOKEN>`; 403 when the token isn't configured
  server-side, 401 on a wrong token, 503 when `ANALYTICS_KV` is unbound.

### `workers/image-proxy` (`workers/image-proxy/src/index.js`)

- **`GET /data`** — serves `site-data.json` from the `SITE_DATA` KV binding with CF-cache
  backing (cache key includes the URL, so `?v=N` query strings purge stale entries).
- **Any other `GET`** (the client requests the worker root URL with a `prompt` query
  param — see `getImageUrl()` in `src/app.js`) — proxies Pollinations image
  generation, injecting `POLLINATIONS_API_KEY`. Cache TTL is 7 days; errors return an SVG
  placeholder with the upstream status.

## Configuration

Client config lives in the inline `window._env` block in `index.html`:

- `IMAGE_PROXY_URL` / `DATA_URL` — image-proxy worker endpoints (prod values are the
  deployed `daniel-bca.workers.dev` URLs)
- `CONTENT_API_URL` — content-api worker endpoint for text generation
- `POLLINATIONS_API_KEY` + `USE_POLLINATIONS_API_KEY` — client-side key fallback (both
  off by default; prefer the workers)
- `ENABLE_ANALYTICS`, `ANALYTICS_ENDPOINT`, `ANALYTICS_DASHBOARD_TOKEN` — analytics,
  **off by default**

Static-build flags are set in `index.html`
(`__COLORVERSE_STATIC__`, `__COLORVERSE_DATA_URL__`).

## Analytics

Privacy-first, off by default, allowlisted on **both** sides:

- Client: `_isAllowedEvent()` + `_sanitizeProps()` in `src/services/analyticsManager.js`
  strip disallowed props. Only `page_view` (hash path, query-stripped) carries any prop; all
  other events are count-only.
- Server: `ALLOWED_ANALYTICS_EVENTS` + `sanitizeBatch()` in
  `workers/content-api/src/index.js` re-validate every batch, since the
  endpoint is public.

The full contract (what we do and don't collect, session IDs, batching, how to add an
event) is in [ANALYTICS.md](./ANALYTICS.md).

## Security

- **XSS:** all generated text is untrusted. `escapeHtml()` / `escapeJsAttr()`
  in `src/app.js` wrap every interpolation of `item.title` / `item.description` into
  `innerHTML` templates and `onclick` attribute args — 50+ call sites. The
  2026-10-04/05 escape pass (see [Changelog](./CHANGES.md)) covered all render functions, including the
  favorites and dashboard renderers. New render code must escape too.
- **Secrets:** server-side in worker secrets only (see [CONTRIBUTING.md](./CONTRIBUTING.md)
  for the commit-side guard rails).
- **Analytics privacy:** allowlist on both client and server; unknown events dropped
  server-side.

## Testing

- **Vitest** (`vitest.config.ts`, jsdom env) runs unit, integration, and worker tests
  under `tests/` and `workers/`. `npm test` and `npm run test:run` are one-shot;
  `npm run test:watch` watches for changes.
- **Playwright** (`playwright.config.ts`) runs local browser tests under `tests/e2e/`
  against the static server on port 4000. Run it with `npm run test:e2e`.
  `npm run test:e2e:live` uses `playwright.live.config.ts` for opt-in remote checks.
- **Packaged and offline checks:** `npm run test:e2e:dist` uses
  `playwright.dist.config.ts` against `dist/`. `npm run test:e2e:sw` uses
  `playwright.sw.config.ts` with real service workers at root and `/colorverse/`
  mounts; set `PLAYWRIGHT_SW_ROOT=dist` to check packaged assets. See
  [Development](./DEVELOPMENT.md) for prerequisites.
- Unit, integration, worker, and browser suites are
  available as separate commands. The main `src/app.js` entry point is not directly
  imported by the unit tests, so coverage is concentrated in services and helpers.

## Build & deploy

- `scripts/build.js` (`npm run build`) generates `dist/`: generated `site-data.json`,
  downloaded JPGs (concurrency + backoff for Pollinations 429/402), `sitemap.xml`, and a
  copy of the app with static-mode flags injected into `dist/index.html`. Requires
  `POLLINATIONS_API_KEY` in `.env` for generation. Packaging existing fixture data
  without provider calls is documented in [Development](./DEVELOPMENT.md).
- The deployed site (GitHub Pages) runs in static mode, fetching `site-data.json` from
  the worker's `/data` route and generating images on demand through the image-proxy.
- `service-worker.js` provides offline support: **cache-first** for recognized CDN
  assets and local binary assets; **network-first** for local code/data and API
  requests; **stale-while-revalidate** for remaining image requests; and network with
  cache fallback for other requests. Fetch-handler order determines which strategy
  applies. `offline.html` is the fallback page; cache names are defined in the worker.
- `service-worker-register.js` listens for `controllerchange` (fired when a new SW
  activates via `skipWaiting()`) and reloads **only if the user is on the homepage**
  (`#` or `#/`). On item/category routes it skips the reload so users mid-coloring don't
  lose their place; they pick up the new code on their next homepage visit.
