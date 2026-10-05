# ColorVerse - Changelog

## 2026-10-05

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
