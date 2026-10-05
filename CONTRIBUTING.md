# Contributing to ColorVerse

Thanks for helping. This repo is a vanilla-JS PWA (no framework, no bundler), so the
contribution bar is: keep it dependency-light, keep it testable, and never commit keys.

Start with [README.md](./README.md) for the project overview and
[DEVELOPMENT.md](./DEVELOPMENT.md) for the dev workflow. This doc covers the commit
workflow, code style, and the PR checklist.

## Setting up

```bash
git clone <repo-url> colorverse
cd colorverse
npm install          # also installs husky pre-commit hooks (via `prepare`)
npm start            # serves the app at http://localhost:4000 (uses `serve`)
```

There is no build step for the app itself — `index.html` + `app.js` + `src/services/*`
run as-is in the browser. Optional, for content generation only:

```bash
cp .env.example .env   # add your POLLINATIONS_API_KEY
npm run build          # pre-generates dist/ (text + images + sitemap.xml)
```

## Running tests

```bash
npm run test:unit         # Vitest unit tests (src/tests/unit, 131 tests) — what CI runs
npm run test:integration  # Vitest integration tests
npm run test:run          # all Vitest suites, single run (197 tests)
npm test                  # Vitest watch mode
npm run test:e2e:playwright  # Playwright browser E2E (12 tests, chromium + mobile projects)
npm run lint              # ESLint over the whole repo
```

- CI (`.github/workflows/test.yml`) runs `npm ci && npm run test:unit` on every push/PR to
  `main`. Unit tests must pass; e2e is run locally.
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

- **Vanilla JS.** No framework, no transpile step for `app.js` or the services. Browser +
  Node globals are both available to ESLint.
- `eslint.config.js` is the source of truth. Key enforced rules:
  - `eqeqeq` — **error**: always `===` / `!==`
  - `no-console` — warn: only `console.warn()` / `console.error()` are allowed
    (in app code use the `debug` utility at the top of `app.js`; `console.log` is gated
    behind `DEBUG_MODE`)
  - `curly` (warn, "all"), `prefer-const`, `no-var`, `no-unused-vars` (warn, `^_` args ok)
  - `workers/**/*.js` has `no-console` turned off
- Prettier (`.prettierrc`): 2-space indent, double quotes, 100-char width, semicolons, LF.
- New user-facing behavior in a service should get a unit test in
  `src/tests/unit/services/` (see `favoritesManager.test.ts`, `searchManager.test.ts`,
  `cacheManager.test.ts`).

## Where things live

| Path                         | What it is                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `app.js`                     | Monolith (~5.8k lines): hash routing (`handleRouteChange`), all render functions, state   |
| `index.html`                 | Markup, `window._env` config block, and the script load order for services                |
| `src/services/*.js`          | Managers loaded as scripts by `index.html`; each exposes a `window.X` singleton           |
| `src/modules/aiProviders.js` | Multi-provider AI call helpers (`callAIAPI` etc.), loaded before `app.js`                 |
| `workers/content-api/`       | CF Worker: AI text proxy + `/events` + `/events/stats` (deployed separately via wrangler) |
| `workers/image-proxy/`       | CF Worker: Pollinations image proxy + `/data` (KV-backed site-data)                       |
| `build.js`                   | Optional static build → `dist/` (text, images, sitemap.xml, offline.html)                 |
| `src/tests/`                 | `unit/`, `integration/` (Vitest), `e2e/` (Playwright), `mocks/`, `helpers.ts`, `setup.ts` |

## PR checklist

- [ ] `npm run test:unit` passes (131 tests)
- [ ] `npm run lint` has **0 errors**. There are ~132 pre-existing warnings in the baseline;
      don't add errors, and don't feel obligated to fix unrelated warnings.
- [ ] No secrets in the diff — no `sk_*` / `pk_*` keys (the pre-commit hook enforces this)
- [ ] Commit message is conventional (`feat:` / `fix:` / `docs:` / `test:` / `chore:`)
- [ ] `CHANGES.md` updated for user-facing changes (follow the dated-section format)
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
- All AI-generated content interpolated into HTML must go through `escapeHtml` /
  `escapeJsAttr` (`app.js`) — the same rule applies to any new render code.
