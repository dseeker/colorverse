# Contributing to ColorVerse

Thanks for helping. This repo is a vanilla-JS PWA (no framework, no bundler), so the
contribution bar is: keep it dependency-light, keep it testable, and never commit keys.

Start with [README.md](../README.md) for the project overview and
[DEVELOPMENT.md](./DEVELOPMENT.md) for the dev workflow. This doc covers the commit
workflow, code style, and the PR checklist.

## Setting up

```bash
git clone <repo-url> colorverse
cd colorverse
npm install          # also installs husky pre-commit hooks (via `prepare`)
npm start            # static server on http://localhost:4000 (also npm run dev)
```

There is no build step for the app itself — `index.html` + `src/app.js` + `src/services/*`
run as-is in the browser. Optional, for content generation only:

```bash
cp .env.example .env   # add your POLLINATIONS_API_KEY
npm run build          # pre-generates dist/ (text + images + sitemap.xml)
```

For packaging without provider calls, see [Development](./DEVELOPMENT.md).

## Running tests

```bash
npm run test:unit         # Vitest unit tests — what CI runs
npm run test:integration  # Vitest integration tests
npm run test:workers      # Cloudflare Worker tests
npm run test:run          # all configured Vitest suites, single run
npm test                  # all configured Vitest suites, single run
npm run test:watch         # Vitest watch mode
npm run test:e2e           # local Playwright browser E2E on port 4000
npm run test:e2e:live      # opt-in remote checks (playwright.live.config.ts)
npm run lint              # ESLint over the whole repo
```

- Default tests do not require paid provider access. Local Playwright uses
  `playwright.config.ts`; remote checks use the separate `playwright.live.config.ts`.
- Worker deploy (`.github/workflows/deploy-workers.yml`) is separate and only triggers on
  `workers/**` changes.

## Committing

Commits follow conventional-commit style — recent history is a good reference:

```
feat: wire searchManager into #search route
fix: duplicate CORS header on /data worker route
docs: mark ROADMAP #5 (search), #6 (sharing), #10 (analytics) done
test: tolerate mobile Safari generic 404 console message for SW
chore: bump Node to 22 in deploy workflow
```

The husky pre-commit hook (`.husky/pre-commit`) does two things:

1. Runs `lint-staged` — `eslint --fix` + `prettier --write` on staged
   `*.js,*.ts,*.jsx,*.tsx`; `prettier --write` on staged `*.json,*.css,*.md`.
2. Blocks any staged file matching the regex `(sk|pk)_[A-Za-z0-9]{12,}` — i.e. a plaintext
   Pollinations API key. Encoded forms (`_cv('...', salt)`, see `index.html`) and
   worker-deployed keys do not trip this, but a raw key in any file does.

Do not bypass the hook with `--no-verify` except for a deliberate local-only commit.

## Code style

- **Vanilla JS.** No framework, no transpile step for `src/app.js` or the services. Browser +
  Node globals are both available to ESLint.
- `eslint.config.js` is the source of truth. Key enforced rules:
  - `eqeqeq` — **error**: always `===` / `!==`
  - `no-console` — warn: only `console.warn()` / `console.error()` are allowed
    (in app code use the `debug` utility at the top of `src/app.js`; `console.log` is gated
    behind `DEBUG_MODE`)
  - `curly` (warn, "all"), `prefer-const`, `no-var`, `no-unused-vars` (warn, `^_` args ok)
  - `workers/**/*.js` has `no-console` turned off
- Prettier (`.prettierrc`): 2-space indent, double quotes, 100-char width, semicolons, LF.
- New user-facing behavior in a service should get a unit test in
  `tests/unit/services/` (see `favoritesManager.test.ts`, `searchManager.test.ts`,
  `cacheManager.test.ts`).

## Where things live

| Path                         | What it is                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `src/app.js`                 | Main browser entry point: hash routing (`handleRouteChange`), render functions, and state |
| `index.html`                 | Markup, `window._env` config block, and the script load order for services                |
| `src/services/*.js`          | Managers loaded as scripts by `index.html`; each exposes a `window.X` singleton           |
| `src/modules/aiProviders.js` | Multi-provider AI call helpers (`callAIAPI` etc.), loaded before `src/app.js`             |
| `workers/content-api/`       | CF Worker: AI text proxy + `/events` + `/events/stats` (deployed separately via wrangler) |
| `workers/image-proxy/`       | CF Worker: Pollinations image proxy + `/data` (KV-backed site-data)                       |
| `scripts/build.js`           | Optional static build → `dist/` (text, images, sitemap.xml, offline.html)                 |
| `tests/`                     | `unit/`, `integration/` (Vitest), `e2e/` (Playwright), `mocks/`, `helpers.ts`, `setup.ts` |
| `archive/openrouter.js`      | Legacy standalone OpenRouter integration; not a browser entry point                       |

## PR checklist

- [ ] `npm run test:unit` passes
- [ ] `npm run lint` has **0 errors**. There are ~132 pre-existing warnings in the baseline;
      don't add errors, and don't feel obligated to fix unrelated warnings.
- [ ] No secrets in the diff — no `sk_*` / `pk_*` keys (the pre-commit hook enforces this)
- [ ] Commit message is conventional (`feat:` / `fix:` / `docs:` / `test:` / `chore:`)
- [ ] [Changelog](./CHANGES.md) updated for user-facing changes (follow the dated-section format)
- [ ] If you touch analytics events: update **both** allowlists (see below) and
      [ANALYTICS.md](./ANALYTICS.md)

## Security notes

- **Never commit API keys.** The pre-commit hook blocks `sk_*`/`pk_*` strings of 12+ chars.
  `.env.example` is the template — `.env` is gitignored.
- Production path for keys: **server-side**, in the workers. `workers/content-api` and
  `workers/image-proxy` read `POLLINATIONS_API_KEY` (and `OPENROUTER_API_KEY`,
  `GOOGLE_GEMINI_API_KEY`) from wrangler secrets — set with
  `npx wrangler secret put <name>` or via the deploy workflow. The client never receives
  them when `IMAGE_PROXY_URL` / `CONTENT_API_URL` are configured.
- The `_cv()` helper in `index.html` (Base64 + XOR) is a **deterrent against casual
  view-source copying, not real security**. Prefer the worker path for anything new.
- All generated content interpolated into HTML must go through `escapeHtml` /
  `escapeJsAttr` (`src/app.js`) — the same rule applies to any new render code.
