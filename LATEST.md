# ColorVerse - Latest State & Context

## Current Status (October 4, 2026)

### Recent Changes Completed

#### Debug System

- URL-based `DEBUG_MODE`: enable with `?debug=true`, `#debug`, or `?dev=true`.
- All console logs wrapped via a `debug` utility; errors always surface.
- Defined at the top of `app.js`.

#### Static / Worker-Backed Mode

- Site is served in static mode (`window.__COLORVERSE_STATIC__ = true`).
- `site-data.json` is fetched from the image-proxy worker's `/data` route (KV-backed).
- Images route through the image-proxy worker so the Pollinations `sk_*` key stays server-side.
- See `POLLINATIONS_INTEGRATION.md` for the deploy/wiring steps.

#### Cache System

- Site data cached for 24 hours (deterministic content per day).
- Image URL cache persisted to `localStorage` on a 10% write chance.
- Item image generation params cached per item in `localStorage`.

#### Theme System

- Tailwind-based light/dark/colorful themes; `dark:` prefix classes on `<html>`.
- Deterministic gradients keyed off section title/id (no `Math.random()` for colors).

#### AI Model Configuration

- Primary: `gemini-fast`; fallback chain in `src/services/aiProviderConfig.js`.
- Text API calls route through `workers/content-api/` (Pollinations / OpenRouter / Gemini).

#### Deterministic Content

- Featured categories, popular items, related items, and gradients all use date/hash-based algorithms.

#### SEO (2026-10-04)

- `src/services/seoManager.js` is now loaded by `index.html` and called from `handleRouteChange` (`updateSEO` helper in `app.js`).
- JSON-LD (ImageObject, BreadcrumbList, WebSite, Organization, CollectionPage) and meta tags update per route.
- `build.js` now emits `dist/sitemap.xml` so `robots.txt`'s sitemap reference resolves.

#### Offline Fallback (2026-10-04)

- Added `offline.html`; service worker pre-caches it as the cache-first fallback.
- Bumped `STATIC_CACHE` and `CACHE_NAME` to `v2` so existing clients pick up the new asset.

#### Analytics (2026-10-05)

- Added `src/services/analyticsManager.js`. Off by default; gated on `window._env.ENABLE_ANALYTICS`.
- Tracks only `page_view`, `print`, `download`, `favorite_add`, `favorite_remove`. No IPs, no user IDs, no search contents, no AI content.
- Batches events and flushes on a 10s timer / 50-event queue / `visibilitychange` / `pagehide`.
- Added `/events` route to `workers/content-api`; re-validates batches, optionally forwards to `ANALYTICS_SINK`.
- See `ANALYTICS.md` for the full privacy contract and how to enable.

#### Analytics Dashboard (2026-10-05)

- `workers/content-api` keeps aggregate counters in an `ANALYTICS_KV` KV namespace (single JSON blob: per-event totals + per-path `page_view` counts, capped at 500 distinct paths). Writes are skipped silently when `ANALYTICS_KV` is unbound, so `/events` never fails on missing KV.
- New `GET /events/stats` route returns the counters. Bearer-token gated via `ANALYTICS_ADMIN_TOKEN`: 403 if the token is unset server-side, 401 on a wrong/missing token.
- `app.js` adds a `#dashboard` hash route (admin-only, not in the nav) that fetches `{ANALYTICS_ENDPOINT or CONTENT_API_URL}/events/stats` using `window._env.ANALYTICS_DASHBOARD_TOKEN` and renders event totals + top 20 paths with loading/error/empty states. All data is escaped with `escapeHtml`.
- `index.html` adds `ANALYTICS_DASHBOARD_TOKEN` (empty = dashboard disabled). `wrangler.toml` adds the `ANALYTICS_KV` binding (placeholder id).

#### Favorites (2026-10-05)

- `src/services/favoritesManager.js` is now loaded by `index.html` and wired into the app (was a dead service like SEOManager used to be).
- Item page has a real "Add/Remove from Favorites" button (replaces the disabled "Save (Coming Soon)" placeholder). Toggles via `window.toggleFavoriteFromItem`.
- Header heart button navigates to `#favorites` (hash route) so back-button, SEO, and analytics page-view fire correctly.
- `#favorites` route renders the saved-pages grid via `FavoritesManager.showFavoritesView()`.
- `item.name` normalized to `item.title || item.name` (live data uses `title`); all AI-content interpolations in the favorites view escaped.

### File Structure

```
colorverse/
├── index.html                      # Main HTML (Tailwind + inline env config)
├── app.js                          # Main app (~5k lines)
├── offline.html                    # SW offline fallback
├── service-worker.js               # PWA service worker (v2)
├── service-worker-register.js      # SW registration
├── robots.txt                      # SEO robots + sitemap reference
├── favicon.svg
├── build.js                        # Static build (text + images + sitemap.xml)
├── openrouter.js                   # OpenRouter API config
│
├── src/
│   ├── modules/aiProviders.js
│   └── services/
│       ├── aiProviderConfig.js
│       ├── analyticsManager.js      # Privacy-first event tracking (off by default)
│       ├── cacheManager.js          # IndexedDB cache
│       ├── coloringTipsManager.js   # Random tip tooltip
│       ├── favoritesManager.js      # localStorage favorites
│       ├── imageLoader.js           # Lazy loading
│       ├── MultiProviderAIManager.js
│       ├── performanceMonitor.js    # Web Vitals
│       ├── searchManager.js
│       └── seoManager.js            # JSON-LD + meta + sitemap generator
│
├── src/tests/                       # Vitest unit + integration; Playwright e2e
│
├── workers/
│   ├── image-proxy/                 # CF Worker: proxies Pollinations images + /data (KV)
│   ├── content-api/                 # CF Worker: proxies text gen + /events analytics route
│   └── shared/                      # constants.js, utils.js
│
├── archive/                         # Archived debug/test scripts
│
└── .github/workflows/               # test.yml, deploy-workers.yml, claude.yml
```

### Key URLs & Testing

**Debug mode:**

```
http://localhost:4000/?debug=true
http://localhost:4000/#debug
```

**Console helpers:**

```javascript
clearAllCache();
DEBUG_MODE;
applyTheme("dark");
```

### Environment

Create `.env` (or set `POLLINATIONS_API_KEY` in the environment):

```
POLLINATIONS_API_KEY=your_key_here
```

Client-side `window._env` is set inline in `index.html` (`IMAGE_PROXY_URL`, `USE_POLLINATIONS_API_KEY`, etc.).

### Open Follow-ups

- Test coverage is 0% for `app.js` (monolithic); standalone helpers in `src/services/` are tested.
- No analytics integration yet (ROADMAP feature #10).
- No i18n yet (ROADMAP feature #9).

Last updated: October 4, 2026
