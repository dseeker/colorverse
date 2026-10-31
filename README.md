# ColorVerse

ColorVerse is a vanilla-JavaScript progressive web app for browsing, generating,
downloading, and printing personalized coloring pages. It uses Pollinations for AI
content and Cloudflare Workers for optional server-side API access.

## Get started

Requirements: Node.js 20 or newer and npm.

```bash
npm ci
npm start
```

Both `npm start` and `npm run dev` serve the repository statically on port 4000:

```bash
npm run dev
```

The browser app runs directly from `index.html`; no app build step is required.
`npm run build` is an optional content-generation build and requires
`POLLINATIONS_API_KEY` when generating content. Offline packaging is also available;
see [Development](./docs/DEVELOPMENT.md). For production, configure worker endpoints and secrets
instead of exposing provider keys in the browser. See
[Pollinations integration](./docs/POLLINATIONS_INTEGRATION.md).

## What it does

- Browse categories and seasonal collections; search coloring pages.
- Generate coloring-page images in multiple styles.
- Save favorites, browse palettes, and view coloring tips.
- Switch themes and interface languages.
- Download, print, and share pages.
- Use offline support and route-aware metadata.

Feature progress and remaining work are tracked in the
[roadmap](./docs/ROADMAP.md).

## Tests and checks

```bash
npm test                     # One-shot Vitest run (same as test:run)
npm run test:run              # Vitest unit, integration, and worker tests
npm run test:watch            # Vitest watch mode
npm run test:unit             # Unit tests
npm run test:integration      # Integration tests
npm run test:workers          # Cloudflare Worker tests
npm run test:e2e              # Local Playwright browser tests on port 4000
npm run test:e2e:dist         # Local browser checks against packaged dist/
npm run test:e2e:sw           # Real offline service-worker checks
npm run test:e2e:live         # Opt-in remote checks (playwright.live.config.ts)
npm run test:e2e:ui           # Playwright UI
npm run lint
npm run format:check
```

The default Vitest configuration excludes browser E2E tests; run those with
Playwright. Local E2E tests use `playwright.config.ts`; remote checks are explicitly
separate and may contact deployed services. CI runs automated validation without
requiring paid provider access.

## Project layout

| Path                        | Purpose                                           |
| --------------------------- | ------------------------------------------------- |
| `index.html`, `src/app.js`  | Browser entry point, routing, and UI              |
| `src/services/`             | Feature services and browser integrations         |
| `src/modules/`              | AI provider helpers                               |
| `src/data/`                 | Palette and pencil-set data                       |
| `workers/content-api/`      | Text generation, catalog, and analytics endpoints |
| `workers/image-proxy/`      | Image proxy and site-data endpoint                |
| `scripts/build.js`          | Optional static content build                     |
| `tests/`, `workers/*/test/` | Vitest and Playwright tests                       |
| `archive/openrouter.js`     | Legacy standalone OpenRouter integration          |

## Project documentation

- [Development workflow](./docs/DEVELOPMENT.md) — local server, tests, and formatting
- [Architecture](./docs/ARCHITECTURE.md) — app structure, routing, workers, and deployment
- [Contributing](./docs/CONTRIBUTING.md) — code style, security, and pull request checklist
- [Roadmap](./docs/ROADMAP.md) — objectives, current status, and open priorities
- [Analytics](./docs/ANALYTICS.md) — privacy contract and worker setup
- [JSON generator testing](./docs/TESTING-JSON-GENERATOR.md) — optional AI content checks
- [Pollinations integration](./docs/POLLINATIONS_INTEGRATION.md) — API and worker configuration
- [Pollinations API notes](./docs/AI-APIDOCS.md) — endpoint and model reference
- [Changelog](./docs/CHANGES.md) — dated historical changes

## License

ColorVerse is licensed under
[CC BY-NC 4.0](./LICENSE). Commercial use is not permitted under this license.
