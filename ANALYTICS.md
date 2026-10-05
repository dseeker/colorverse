# Analytics

ColorVerse ships with a privacy-first analytics system. It is **off by default** and must be explicitly enabled. When disabled, the analytics manager is a no-op — every `track()` call returns immediately and no network requests are made.

## What we collect

Only these events are emitted, and only when analytics is enabled:

| Event             | Props         | Source                                   |
| ----------------- | ------------- | ---------------------------------------- |
| `page_view`       | `path` (hash) | `handleRouteChange` in `app.js`          |
| `print`           | none          | `printColoringPage()` in `app.js`        |
| `download`        | none          | download `<a>` `onclick` in `renderItem` |
| `favorite_add`    | none          | `FavoritesManager.addFavorite()`         |
| `favorite_remove` | none          | `FavoritesManager.removeFavorite()`      |

The `path` prop is the route hash with query params stripped (`#search?q=foo` becomes `#search`) and truncated to 200 chars. No item identifiers, titles, descriptions, prompts, search contents, or user input are ever sent.

## What we DO NOT collect

- IPs, user agents, or any user identifiers
- Search query contents
- Item titles, descriptions, or any AI-generated content
- localStorage / favorites contents
- Any field not in the table above, even if a caller passes it

The server (`workers/content-api` `/events` route) re-validates every batch and drops unknown event names or oversized payloads, so the privacy contract is enforced on both sides.

## Session IDs

Each browser session gets a random 64-bit hex token. It groups events from one session without correlating across sessions or devices. It is **not** derived from any user data — it's `crypto.getRandomValues`. It rotates when the tab reloads.

## How to enable

Edit the `window._env` block in `index.html`:

```html
window._env = window._env || { // ...existing keys... ENABLE_ANALYTICS: true, ANALYTICS_ENDPOINT:
'https://your-worker.example.workers.dev/events', };
```

`ANALYTICS_ENDPOINT` should point at a `/events` route. The default content-api worker already has one at `workers/content-api/src/index.js`. If you deploy that worker, set `ANALYTICS_ENDPOINT` to its `/events` URL.

## Where events go

The default `/events` route in `workers/content-api`:

1. Validates the batch (drops unknown events, clamps prop size to 512 bytes, caps batch at 100 events)
2. If `ANALYTICS_SINK` is set in the worker's env, forwards the sanitized batch to that URL with a 5s timeout
3. Otherwise logs a single summary line (`[content-api] analytics: N events (sink not configured)`) and returns 204

## Dashboard (admin)

The worker keeps aggregate counters in an `ANALYTICS_KV` KV namespace (single JSON blob: per-event totals + per-path `page_view` counts, capped at 500 distinct paths). If `ANALYTICS_KV` is not bound, counter writes are skipped silently and the `/events` POST still succeeds.

- **`GET /events/stats`** returns the counters as JSON. Auth gate: requires `Authorization: Bearer <ANALYTICS_ADMIN_TOKEN>`; returns **403** if no `ANALYTICS_ADMIN_TOKEN` is configured server-side, **401** on a wrong/missing token.
- **Client:** set `window._env.ANALYTICS_DASHBOARD_TOKEN` in `index.html` (empty = dashboard disabled). The `#dashboard` hash route (not in the main nav) fetches `{ANALYTICS_ENDPOINT or CONTENT_API_URL}/events/stats` with that token and renders event totals + top 20 paths.

Setup: `npx wrangler kv:namespace create ANALYTICS_KV`, paste the id into `workers/content-api/wrangler.toml`, and `npx wrangler secret put ANALYTICS_ADMIN_TOKEN`.

So you can run three configurations:

- **Log-only (dev):** leave `ANALYTICS_SINK` unset. Events are accepted and logged in aggregate.
- **Forward to a sink (prod):** set `ANALYTICS_SINK` to a Cloudflare Workers Analytics endpoint, PostHog ingest URL, Plausible events endpoint, or any compatible HTTP sink.
- **Off entirely:** leave `ENABLE_ANALYTICS: false` in `index.html`. No events are sent from the client at all.

## Batching and delivery

- Events queue in-memory in `AnalyticsManager.queue`
- Flush is triggered on: 10s timer, queue reaching 50 events, `visibilitychange` → hidden, or `pagehide`
- On flush failure, events are re-queued (no silent drops)
- `navigator.sendBeacon` is preferred on tab close to avoid request cancellation; `fetch(..., { keepalive: true })` is the fallback

## Adding a new event

1. Add the name to `ALLOWED_ANALYTICS_EVENTS` in `src/services/analyticsManager.js`
2. Add the name to `ALLOWED_ANALYTICS_EVENTS` in `workers/content-api/src/index.js`
3. Document which props (if any) survive in `_sanitizeProps` in the manager
4. Add the `window.analytics.track('name', {...})` call at the relevant call site
5. Update the table at the top of this doc

Do not skip steps 1 and 2 — the allowlist is the privacy contract, and the server re-validates it.
