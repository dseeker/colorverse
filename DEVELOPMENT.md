# Development Guide

## Codebase Overview

ColorVerse is a client-side web application that renders AI-generated coloring pages. The main files are:

- `index.html` — core page markup, theme switcher, and `window._env` configuration.
- `app.js` — application logic: routing, rendering, fetching AI images/text, caching, themes.
- `src/services/` — standalone managers (SEO, search, favorites, cache, tips, image loading, performance, AI provider config).
- `src/modules/aiProviders.js` — AI provider helpers loaded before `app.js`.
- `service-worker.js` + `service-worker-register.js` — PWA offline support and caching.
- `workers/image-proxy/` and `workers/content-api/` — Cloudflare Workers that proxy Pollinations and keep `sk_*` keys server-side.
- `build.js` — optional static build that pre-generates text + images into `dist/`.
- `src/tests/` — Vitest unit and integration tests (Playwright E2E tests live here too, but run separately).

## Running the App

Start a static server on port 4000 (pick one):

```bash
npm start                # uses `serve`
npx serve -l 4000
```

Then open http://localhost:4000

## Testing

```bash
npm test                 # Vitest watch mode
npm run test:run         # single run
npm run test:unit        # unit tests only
npm run test:integration # integration tests only
npm run test:coverage    # with coverage
npm run test:e2e:playwright # Playwright E2E (browser)
```

Tests live in `src/tests/` (unit, integration, e2e, mocks). The legacy `test/` directory is empty and excluded by `vitest.config.ts`.

## Lint & Format

```bash
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

Pre-commit hooks (`.husky/pre-commit`) run lint-staged and block plaintext `sk_*/pk_*` Pollinations keys (threshold: 12+ chars). Encode keys with `_cv()` (see `index.html`) or use `IMAGE_PROXY_URL` (worker) instead.

## Additional Documentation

- **POLLINATIONS_INTEGRATION.md** — Pollinations v3 API integration + worker deploy steps.
- **AI-APIDOCS.md** — Pollinations API reference.
- **TESTING-JSON-GENERATOR.md** — testing the AI JSON structure output.
- **ROADMAP.md** — proposed features and competitors.

## Environment

Copy `.env.example` to `.env` and set `POLLINATIONS_API_KEY`. The client reads `window._env` (set inline in `index.html`) for `IMAGE_PROXY_URL`, `USE_POLLINATIONS_API_KEY`, `CONTENT_API_URL`, `DATA_URL`. See `POLLINATIONS_INTEGRATION.md` for the worker-based production path.
