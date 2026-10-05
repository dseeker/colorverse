# Architecture

ColorVerse is a vanilla-JS PWA — no framework, no build step for the app. The site is a
~5,800-line `app.js` monolith plus a set of "manager" services loaded as plain scripts,
backed by two Cloudflare Workers that keep API keys server-side.

See [README.md](./README.md) for the project overview and [DEVELOPMENT.md](./DEVELOPMENT.md)
for the dev workflow.

## System overview

```
                +-------------------------------------------+
                |                Browser (client)           |
                |                                           |
                |  index.html  ->  app.js (routing, render) |
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
(lines ~564-572 and ~1373-1383) and each attaches a singleton to `window`:

| File                        | Window global                   | Purpose                                                                                                 |
| --------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `seoManager.js`             | `window.SEOManager`             | Meta tags, JSON-LD, sitemap generation                                                                  |
| `analyticsManager.js`       | `window.analytics`              | Privacy-first event batching                                                                            |
| `favoritesManager.js`       | `window.FavoritesManager`       | localStorage favorites + view                                                                           |
| `searchManager.js`          | `window.SearchManager`          | Search index + results page (loaded as a `type="module"` script — see the comment at `index.html:1377`) |
| `coloringTipsManager.js`    | `window.ColoringTipsManager`    | Static tips content                                                                                     |
| `performanceMonitor.js`     | `window.PerformanceMonitor`     | Core Web Vitals collection                                                                              |
| `imageLoader.js`            | `window.OptimizedImageLoader`   | IntersectionObserver lazy loading                                                                       |
| `cacheManager.js`           | `window.CacheManager`           | LRU cache + IndexedDB fallback                                                                          |
| `MultiProviderAIManager.js` | `window.MultiProviderAIManager` | Provider/model fallback + backoff                                                                       |

Two subtleties:

- Most of these files also end with an `export default` for Vitest. Files that are loaded
  as **classic** scripts can't contain `export` (it's a SyntaxError), so the ones that
  need it (`searchManager.js`, and the `?v=2` module scripts at `index.html:564-572`) are
  loaded with `type="module"` — deferred, so they still run before `app.js`'s
  `DOMContentLoaded` handler.
- `src/modules/aiProviders.js` is loaded as a classic script before `app.js` and defines
  the cross-file globals (`callAIAPI`, `AI_PROVIDERS`, ...) that `app.js` and the
  services rely on — ESLint declares these in `eslint.config.js:32-54`.

Services with unit tests live in `src/tests/unit/services/`
(`favoritesManager.test.ts`, `searchManager.test.ts`, `cacheManager.test.ts`).

## Routing

Hash-based, dispatched by `handleRouteChange()` (`app.js:3615`, wired to `hashchange`
at `app.js:5603`):

- `#` / `#/` — homepage
- `#category/<key>?page=N&sort=...` — category listing (progressive loading)
- `#item/<category>/<item>` — item detail
- `#about`, `#privacy`, `#terms`, `#contact` — static pages
- `#daily-pick`, `#all-categories`, `#favorites`, `#donate` — feature pages
- `#search` / `#search?q=term` — search results
- `#dashboard` — admin-only analytics dashboard (intentionally not in the nav;
  Bearer-token gated)

Flow per navigation (all inside one `try/catch/finally`):

1. `trackPageView(hash)` fires at the top of the try block (`app.js:3647`) — a no-op when
   analytics is disabled.
2. The matching `renderXxx()` builds an HTML string, assigned to
   `mainContent.innerHTML` (render functions are listed in `app.js`, e.g.
   `renderHomepage:1415`, `renderCategory:2050`, `renderItem:2313`,
   `renderSearchPage:3474`).
3. `updateSEO({...})` (`app.js:3396`) updates meta tags + JSON-LD via `window.SEOManager`.
4. `finally`: hide loading, scroll to top, `setupLazyLoading()` for images.

## Data flow

- **Site data:** in static mode (the deployed mode, `window.__COLORVERSE_STATIC__ = true`
  at `index.html:1369`), `generateSiteData()` fetches `site-data.json` from the
  image-proxy worker's `/data` route (`app.js:4083`). The worker reads it from a KV
  binding and caches the response in CF Cache API with per-request CORS
  (`workers/image-proxy/src/index.js:36-85`).
- **Images:** `getImageUrl()` (`app.js:1072`) builds the coloring prompt and, when
  `IMAGE_PROXY_URL` is set, returns a URL through the image-proxy worker
  (`app.js:1178-1185`). The worker appends `key=<POLLINATIONS_API_KEY>` server-side,
  serves from CF cache (7-day TTL), and returns placeholder/error SVGs on failure.
- **Text generation (live mode):** `callAIAPI()` in `src/modules/aiProviders.js` routes
  through `CONTENT_API_URL` (the content-api worker) when set, with model-level fallback;
  otherwise it calls providers directly.

## Cloudflare Workers

Both workers live under `workers/`, share helpers in `workers/shared/`
(`constants.js`, `utils.js`), and are deployed by `.github/workflows/deploy-workers.yml`
(wrangler, Node 22) on changes to `workers/**`.

### `workers/content-api` (`workers/content-api/src/index.js`)

- **`POST /`** — AI text generation proxy. Dispatches on `payload.provider`
  (`pollinations` / `openrouter` / `gemini`) and injects the matching secret. Keys are set
  via `npx wrangler secret put` (see the comments in `wrangler.toml`); `ALLOWED_ORIGINS`
  is a plain var.
- **`POST /events`** — analytics batch endpoint. Re-validates the client's batch against
  the server-side `ALLOWED_ANALYTICS_EVENTS` allowlist (line 27), caps batch size at 100
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
  param — see `app.js:1178-1185`) — proxies Pollinations image
  generation, injecting `POLLINATIONS_API_KEY`. Cache TTL is 7 days; errors return an SVG
  placeholder with the upstream status.

## Configuration

Client config lives in the inline `window._env` block in `index.html` (lines 1353-1368):

- `IMAGE_PROXY_URL` / `DATA_URL` — image-proxy worker endpoints (prod values are the
  deployed `daniel-bca.workers.dev` URLs)
- `CONTENT_API_URL` — content-api worker endpoint for text generation
- `POLLINATIONS_API_KEY` + `USE_POLLINATIONS_API_KEY` — client-side key fallback (both
  off by default; prefer the workers)
- `ENABLE_ANALYTICS`, `ANALYTICS_ENDPOINT`, `ANALYTICS_DASHBOARD_TOKEN` — analytics,
  **off by default**

Static-build flags are set just below at `index.html:1369-1370`
(`__COLORVERSE_STATIC__`, `__COLORVERSE_DATA_URL__`).

## Analytics

Privacy-first, off by default, allowlisted on **both** sides:

- Client: `_isAllowedEvent()` + `_sanitizeProps()` in `src/services/analyticsManager.js`
  (lines 151, 168). Only `page_view` (hash path, query-stripped) carries any prop; all
  other events are count-only.
- Server: `ALLOWED_ANALYTICS_EVENTS` + `sanitizeBatch()` in
  `workers/content-api/src/index.js` (lines 27, 60) re-validate every batch, since the
  endpoint is public.

The full contract (what we do and don't collect, session IDs, batching, how to add an
event) is in [ANALYTICS.md](./ANALYTICS.md).

## Security

- **XSS:** all AI-generated text is untrusted. `escapeHtml()` / `escapeJsAttr()`
  (`app.js:82-98`) wrap every interpolation of `item.title` / `item.description` into
  `innerHTML` templates and `onclick` attribute args — 50+ call sites. The
  2026-10-04/05 escape pass (see `CHANGES.md`) covered all render functions, including the
  favorites and dashboard renderers. New render code must escape too.
- **Secrets:** server-side in worker secrets only (see [CONTRIBUTING.md](./CONTRIBUTING.md)
  for the commit-side guard rails).
- **Analytics privacy:** allowlist on both client and server; unknown events dropped
  server-side.

## Testing

- **Vitest** (`vitest.config.ts`, jsdom env): `src/tests/unit/` (131 tests — what CI runs)
  and `src/tests/integration/` (navigation, theming, image loading, API).
- **Playwright** (`playwright.config.ts`): `src/tests/e2e/` (12 tests across
  `page-loading.test.ts` and `live-site.test.ts`; chromium + iPhone-12 mobile projects;
  spins up its own `serve` server on :4000).
- Coverage: effectively 0% for `app.js` itself (it's a monolith and not importable) —
  only the services and shared helpers are unit-tested. Adding a service with a test in
  `src/tests/unit/services/` is the expected pattern.

## Build & deploy

- `build.js` (`npm run build`) generates `dist/`: AI-generated `site-data.json`,
  downloaded JPGs (concurrency + backoff for Pollinations 429/402), `sitemap.xml`, and a
  copy of the app with static-mode flags injected into `dist/index.html`. Requires
  `POLLINATIONS_API_KEY` in `.env`.
- The deployed site (GitHub Pages) runs in static mode, fetching `site-data.json` from
  the worker's `/data` route and generating images on demand through the image-proxy.
- `service-worker.js` (cache `colorverse-v2`) provides offline support: cache-first for
  static assets, stale-while-revalidate for images, network-first for API responses, and
  `offline.html` as the fallback page.
