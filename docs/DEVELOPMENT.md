# Development Guide

ColorVerse is a browser app with no framework or app bundler. Install dependencies
and run a local static server:

```bash
npm ci
npm start
```

Open `http://localhost:4000`. `npm run dev` is an alias for the same static
server, not a Node execution of the browser entry point (`src/app.js`).

## Validation

```bash
npm test                     # One-shot Vitest run
npm run test:run
npm run test:watch            # Interactive Vitest watch mode
npm run test:unit
npm run test:integration
npm run test:workers
npm run test:e2e              # Local Playwright tests
npm run test:e2e:dist         # Packaged dist/ browser checks
npm run test:e2e:sw           # Real service-worker offline checks
npm run test:e2e:live         # Opt-in remote Playwright checks
npm run lint
npm run format:check
```

`npm test` and `npm run test:run` run Vitest once. Unit and integration tests live
under `tests/`; worker tests live under `workers/`. Use `test:watch` for watch mode.
Playwright browser tests are separate: `playwright.config.ts` starts the local
static server on port 4000, while `playwright.live.config.ts` targets deployed
services without starting a local server. Remote checks are opt-in, not part of
the default test run.

## Optional static build

`scripts/build.js` generates `dist/` and calls the text and image
providers. Set `POLLINATIONS_API_KEY` in `.env` or the environment before running:

```bash
npm run build
npm run serve:dist
```

To package existing data without generating text or images or calling paid APIs:

```bash
npm run build -- --package-only --data-file tests/build/fixtures/site-data.json
npm run serve:dist
```

The equivalent direct command is
`node scripts/build.js --package-only --data-file tests/build/fixtures/site-data.json`.

`--data-file` selects an existing JSON catalog. If omitted in package-only mode,
the build reads `dist/site-data.json`. `--output-dir` can select another output
directory. The fixture is for repeatable local validation, not production content.

## Checking packaged assets and offline support

After packaging the fixture, run:

```bash
npm run test:e2e:dist
npm run test:e2e:sw
PLAYWRIGHT_SW_ROOT=dist npm run test:e2e:sw
```

`playwright.dist.config.ts` runs the local browser suite against `npm run serve:dist`
on port 4000 by default. Stop any source server on that port first: the dist suite
does not reuse it.

`playwright.sw.config.ts` runs real Chromium service-worker checks using an isolated
server at `http://127.0.0.1:4002`. It checks both root and `/colorverse/` mounts,
including precaching `src/app.js` and serving it and the cached index offline.
`PLAYWRIGHT_SW_ROOT` selects the source tree (default `.`) or a packaged directory.
The minimal harness does not execute the app or call provider APIs. These checks
are separate from the ordinary mocked browser suite, which blocks service workers.

See [Pollinations integration](./POLLINATIONS_INTEGRATION.md) for provider and
worker configuration. For system structure and deployment, see
[Architecture](./ARCHITECTURE.md); for contribution workflow, see
[CONTRIBUTING.md](./CONTRIBUTING.md).
