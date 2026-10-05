# ColorVerse - Changelog

## 2026-10-05

- **Sharing**: `sharePage()` now falls back to an accessible per-platform share modal (Twitter/X, Pinterest, Facebook, WhatsApp, Reddit, Email, Copy Link) instead of a raw `alert(url)` when the native Web Share API is unavailable or the user cancels it. The modal is keyboard-navigable (focus trap, Escape to close, click-outside to close, focus returns to the Share button) and each button has an `aria-label`. `share` was added to the analytics allowlist in `analyticsManager.js` and the content-api worker (count-only, no props).
- **Analytics dashboard**: Added an admin-only `#dashboard` route in `app.js` (not in the main nav) that reads aggregate stats from the content-api worker's new `GET /events/stats` route. The worker now keeps counters in an `ANALYTICS_KV` KV namespace (single JSON blob: per-event totals + per-path `page_view` counts, capped at 500 distinct paths); counter writes are skipped silently when the binding is unbound so `/events` never fails. `GET /events/stats` is Bearer-token gated via `ANALYTICS_ADMIN_TOKEN` (403 when unset server-side, 401 on a wrong token). New `window._env.ANALYTICS_DASHBOARD_TOKEN` config (empty = dashboard disabled); `wrangler.toml` gains the `ANALYTICS_KV` binding (placeholder id — create via `npx wrangler kv:namespace create ANALYTICS_KV`). All dashboard data is rendered through `escapeHtml`.

- **Favorites**: Wired `src/services/favoritesManager.js` into the app (was a dead service). `index.html` now loads it; `app.js` adds a `#favorites` route, replaces the disabled "Save (Coming Soon)" button on the item page with a real toggle (`window.toggleFavoriteFromItem`), and exposes `siteData` on `window` via a getter so the handler can read the item payload. The header heart button now navigates to `#favorites` (via hash) so back-button and analytics work correctly. Fixed `item.name` → `item.title || item.name` normalization (live data uses `title`); escaped all AI-content interpolations in `showFavoritesView`; replaced broken `window.showItemDetail`/`window.showHomepage` onclicks with hash navigation. Added `favorite_add` / `favorite_remove` to the analytics allowlist (both client and server).
- **Analytics**: Added `src/services/analyticsManager.js` — privacy-first event tracking, off by default (`window._env.ENABLE_ANALYTICS`). Tracks `page_view`, `print`, `download` only; no IPs, user IDs, search contents, or AI content. Batches and flushes on timer / queue-size / `visibilitychange` / `pagehide`.
- **Worker**: Added `/events` route to `workers/content-api`. Re-validates batches (allowlist + size caps), forwards to optional `ANALYTICS_SINK` env var, otherwise logs aggregate count.
- **Docs**: Added `ANALYTICS.md` covering the privacy contract, how to enable, and how to add new events. Marked ROADMAP #10 done.
- **Security (follow-up to 2026-10-04)**: Extended HTML-escape pass to `renderDailyPickPage`, `renderSeasonalGallery`, `renderRecentAdditions`, and the catch block of `renderCategoryWithProgressiveLoading` (commit `545eb07`).

## 2026-10-04

- **Security**: Removed hardcoded fallback `pk_*` key in `build.js`; build now fails fast if `POLLINATIONS_API_KEY` is unset. Tightened husky pre-commit hook regex threshold from 20 → 12 chars.
- **SEO**: Wired up `src/services/seoManager.js` (was dead code). `app.js` `updateSEO()` now injects JSON-LD and updates meta tags per route. `build.js` now emits `dist/sitemap.xml` so `robots.txt`'s sitemap reference resolves.
- **Offline**: Added `offline.html`; bumped service-worker cache to `v2`. `cacheFirst` offline fallback now resolves to a real page instead of `caches.match("/offline.html")` (which 404'd).
- **Security**: Added `escapeHtml` / `escapeJsAttr` helpers in `app.js`. Applied to AI-generated `item.title` / `item.description` in `renderItem`, `renderCategory`, `renderRelatedItems`, and the print-window document.
- **Docs**: Refreshed `DEVELOPMENT.md`, `LATEST.md`, `CHANGES.md`; removed references to dead `test/` directory and `test.html`; documented the worker-based production path.

## Earlier

- **Debug system overhaul**: URL-based `DEBUG_MODE` (`?debug=true`, `#debug`, `?dev=true`); all logs wrapped via `debug` utility; errors always surface.
- **Archive cleanup**: Moved `debug/` test scripts to `archive/debug/`; archived `test-json-generator.js` and `generate-image.js`.
- **Cache system**: 24-hour cache for all environments (was 10 min dev / 6 hrs prod); content stays consistent throughout the day.
- **Theme system**: Tailwind classes for light/dark; deterministic gradients based on section title/id.
- **AI model config**: Primary `gemini-fast`; fallback chain in `src/services/aiProviderConfig.js`.
- **Deterministic content**: Featured categories, popular items, related items, and gradients use date/hash-based algorithms.

## How to Use Debug Mode

Add one of these to the URL:

- `http://localhost:4000/?debug=true`
- `http://localhost:4000/#debug`
- `http://localhost:4000/?dev=true`

When enabled you'll see a green "🔧 DEBUG MODE ENABLED" banner in the console, all application logs, performance timings, and API call details.

## Key URLs

- Normal mode: `http://localhost:4000/`
- Debug mode: `http://localhost:4000/?debug=true`
- Clear cache: `clearAllCache()` in the browser console
