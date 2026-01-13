# ColorVerse - Free AI-Generated Coloring Pages

ColorVerse is a web application that provides free, AI-generated coloring pages. Users can browse categories, view daily picks, and download or print high-quality coloring pages.

## Quick Start - Local Development

### Prerequisites

- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)

### Step-by-Step Setup

1. **Clone or download the project** to your local machine

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start the development server**:

   ```bash
   npm start
   ```

4. **Access the application**:
   - **Local URL**: http://localhost:3000
   - **Network URL**: http://192.168.8.196:3000 (your local IP may vary)

### Verification Steps

After starting the server, you should see:

```
   ┌──────────────────────────────────────────────┐
   │                                              │
   │   Serving!                                   │
   │                                              │
   │   - Local:    http://localhost:3000          │
   │   - Network:  http://192.168.8.196:3000      │
   │                                              │
   └──────────────────────────────────────────────┘
```

### Testing with Puppeteer

If you're using Puppeteer for automated testing or screenshots:

1. **Ensure the server is running** (see steps above)

2. **Use the correct URL format**:
   - ✅ **Correct**: `http://localhost:3000`
   - ❌ **Avoid**: `http://127.0.0.1:3000` (may cause connection issues in containers)

3. **Example Puppeteer usage**:
   puppeteer_navigate
   Navigate to a URL
   {
   "url": "http://host.docker.internal:3000",
   "allowDangerous": true
   }

### Troubleshooting

**If you see "Connection refused" errors:**

- Ensure the server is running (`npm start`)
- Check that port 3000 is not already in use
- Try refreshing the page after a few seconds

**If images don't load:**

- Check your internet connection (AI images require external API calls)
- Clear browser cache and refresh
- Check browser console for any CORS or network errors

## Features

- **AI-Powered Image Generation:** Utilizes the Pollinations AI API to create unique coloring pages from text prompts.
- **Diverse Categories:** Offers a wide range of categories such as animals, fantasy, mandalas, nature, and more.
- **Seasonal Themes:** Adapts to different seasons with themed content and color schemes.
- **Theme Switching:** Supports light, dark, and colorful themes for user preference.
- **Daily Picks:** Features a new, hand-selected coloring page each day.
- **Lazy Loading:** Images are loaded efficiently as users scroll, improving performance.
- **Caching:** Site data and image URLs are cached to ensure fast loading times and reduce API calls.
- **Download & Print:** Users can easily download images in JPG format or print directly from the browser.
- **Share Functionality:** Allows users to share coloring pages with others.
- **Responsive Design:** Works seamlessly on various devices.

## Technologies Used

- HTML, CSS, JavaScript
- Tailwind CSS for styling
- Font Awesome for icons
- Pollinations AI API v3 for image generation

## API Integration

This project uses Pollinations.ai API v3 for AI-powered image and text generation.

### Setup

1. **Copy environment configuration**:

   ```bash
   cp .env.example .env
   ```

2. **Add your API key** to `.env`:

   ```
   POLLINATIONS_API_KEY=pk_9sbL41ofRXSoaOC2
   ```

   The API key is pre-configured in `.env.example`.

3. **API Endpoints**:
   - **Image Generation:** `https://gen.pollinations.ai/image/{prompt}`
   - **Text Generation:** `https://gen.pollinations.ai/v1/chat/completions`

### Authentication

All API calls now require authentication via the `Authorization` header.

For detailed API documentation, see [POLLINATIONS_INTEGRATION.md](./POLLINATIONS_INTEGRATION.md).

## Development Commands

| Command                    | Description                                |
| -------------------------- | ------------------------------------------ |
| `npm start`                | Start development server on localhost:3000 |
| `npm test`                 | Run all tests (watch mode with Vitest)     |
| `npm run test:run`         | Run all tests (single run)                 |
| `npm run test:unit`        | Run unit tests only                        |
| `npm run test:integration` | Run integration tests only                 |
| `npm run test:ui`          | Run tests with Vitest UI                   |
| `npm run test:watch`       | Run tests in watch mode for TDD            |
| `npm run test:coverage`    | Generate test coverage report              |
| `npm run lint`             | Check code quality with ESLint             |
| `npm run lint:fix`         | Auto-fix linting issues                    |
| `npm run format`           | Format all files with Prettier             |
| `npm run format:check`     | Check formatting without changing files    |
| `npm install`              | Install dependencies                       |

## Testing

This project uses **Vitest** for unit, integration, and end-to-end testing.

### Test Structure

```
src/tests/
├── unit/              # Unit tests for individual functions (89 tests)
├── integration/       # Integration tests for component interactions (55 tests)
├── e2e/              # End-to-end user journey tests (30 tests)
│   └── user-journeys/
│       ├── browse-categories.test.ts
│       ├── view-coloring-page.test.ts
│       ├── theme-change.test.ts
│       ├── image-loading.test.ts
│       └── responsive-design.test.ts
├── mocks/             # Mock data and API responses
└── helpers.ts         # Test utilities and environment helpers
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit         # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only

# Run with Vitest UI
npm run test:ui

# Run in watch mode for TDD
npm run test:watch

# Generate coverage report
npm run test:coverage
```

src/tests/
├── unit/ # Unit tests for individual functions (89 tests)
├── integration/ # Integration tests for component interactions (55 tests)
├── e2e/ # End-to-end tests (coming soon)
├── mocks/ # Mock data and API responses
└── helpers.ts # Test utilities and environment helpers

````

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
````

### Current Test Results

- ✅ **174 tests passing** (89 unit + 55 integration + 30 E2E)
- ✅ **0 failures**
- ✅ **<1 second execution time**

### Coverage

- Current coverage is low (0%) because `app.js` is monolithic
- Future refactor will extract functions into modules for higher coverage
- Target: 80% coverage for statements, branches, functions, and lines

## Code Quality

### Code Quality Tools

- **ESLint** - JavaScript linting for code quality and error detection
- **Prettier** - Code formatter for consistent style across codebase
- **Husky** - Git hooks manager for automated pre-commit checks
- **lint-staged** - Run linters only on staged files

### Code Quality Configuration

**ESLint Rules:**

- Browser + Node globals
- Warning level for common issues (unused vars, console logs)
- Error level for critical issues (type coercion)

**Prettier Configuration:**

- 2-space indentation
- Double quotes (")
- 100 character line width
- Semicolons required
- LF line endings (Unix style)

### Linting & Formatting

```bash
# Check code quality
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format all files
npm run format

# Check formatting without changing files
npm run format:check
```

### Pre-Commit Hooks

Automated checks run before every commit:

- ESLint validation with auto-fix
- Prettier formatting
- Tests (recommended to run manually)

To bypass hooks (not recommended): `git commit --no-verify`

### Code Style

- Use `const` for variables that don't change
- Use `let` only when necessary
- Use `console.warn()` and `console.error()` for logs
- Always use curly braces: `{` and `}`
- Use `===` instead of `==`
- Add semicolons at end of statements
- Keep lines under 100 characters
- Use meaningful variable names

### Environment Configuration

Tests support both local and production environments via `.env` file:

```bash
# Local development
NODE_ENV=development
VITEST_ENV=development

# Production testing
NODE_ENV=production
VITEST_ENV=production
API_URL=https://your-prod-url.com
```

See `.env.example` for all available environment variables.

## Code Quality

This project uses **ESLint** and **Prettier** for consistent code quality and formatting.

### Code Quality Tools

- **ESLint** - JavaScript linting for code quality and error detection
- **Prettier** - Code formatter for consistent style across the codebase
- **Husky** - Git hooks for automated pre-commit checks
- **lint-staged** - Run linters only on staged files

### Linting & Formatting

```bash
# Check code quality
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format all files
npm run format

# Check formatting without changing files
npm run format:check
```

### Pre-Commit Hooks

Automated checks run before every commit:

- ESLint validation with auto-fix
- Prettier formatting
- Tests (recommended to run manually)

To bypass hooks (not recommended): `git commit --no-verify`

### Code Style

- 2-space indentation
- Double quotes (")
- Semicolons required
- Max line width: 100 characters
- LF line endings (Unix style)

### Current Status

- ✅ **174 tests passing** (89 unit + 55 integration + 30 E2E)
- ✅ **0 failures**
- ✅ **<1 second execution time**
- ✅ **ESLint configured** - 1 error, 80+ warnings (mostly console.log statements)
- ✅ **Prettier configured** - All files properly formatted
- ✅ **Pre-commit hooks** - Automatic validation on commits
- ✅ **IDE compatible** - VSCode, WebStorm, etc.

## Testing End-to-End (E2E)

### E2E Framework

This project includes **Playwright** for browser-based E2E testing.

### Playwright Configuration

```bash
# Run E2E tests with Playwright
npm run test:e2e:playwright

# Run E2E tests with Playwright UI
npm run test:e2e:ui

# Run E2E tests with visible browser (headed mode)
npm run test:e2e:headed
```

### E2E Test Suites

- **Browse Categories** (5 tests) - Homepage navigation, category selection
- **View Coloring Page** (8 tests) - Item viewing, download, print functionality
- **Theme Change** (4 tests) - Theme switching and persistence
- **Image Loading** (5 tests) - Loading states and error handling
- **Responsive Design** (8 tests) - Mobile, tablet, desktop testing

### Coverage

## Project Structure

```
colorverse/
├── index.html          # Main HTML file
├── app.js             # Main application logic
├── package.json       # Project configuration
├── README.md         # This file
└── assets/           # Static assets (if any)
```

## Credits

This project leverages the following AI models:

- Gemini 2.5
- Claude Sonnet 3.7

## Claude Code Action Integration

This project can be extended to use the modified Claude Code Action with OAuth for GitHub Actions, allowing Claude Max subscribers to leverage their subscription for automated code assistance.

### OAuth Setup for Claude Max Subscribers

To set up Claude Code Action with OAuth:

1.  **Install the Claude GitHub app** to your repository: [`https://github.com/apps/claude`](https://github.com/apps/claude)
2.  **Get your OAuth credentials** from your Claude Max subscription:
    - Make sure you are logged in with your Claude Max in Claude with `/login`.
    - Find your `access token`, `refresh token`, and `expires at` in `~/.claude/.credentials.json` (Ubuntu) or by searching "claude -> show password" in KeyChain (macOS).
3.  **Add the following secrets to your repository**:
    - `CLAUDE_ACCESS_TOKEN`: Your Claude OAuth access token
    - `CLAUDE_REFRESH_TOKEN`: Your Claude OAuth refresh token
    - `CLAUDE_EXPIRES_AT`: The token expiration timestamp
4.  **Create a workflow file** (e.g., `.github/workflows/claude.yml`) with the OAuth configuration:

    ```yaml
    name: Claude PR Assistant

    on:
      issue_comment:
        types: [created]
      pull_request_review_comment:
        types: [created]
      issues:
        types: [opened, assigned]
      pull_request_review:
        types: [submitted]

    jobs:
      claude-code-action:
        if: |
          (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
          (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude')) ||
          (github.event_name == 'pull_request_review' && contains(github.event.review.body, '@claude')) ||
          (github.event_name == 'issues' && contains(github.event.issue.body, '@claude'))
        runs-on: ubuntu-latest
        permissions:
          contents: read
          pull-requests: read
          issues: read
          id-token: write
        steps:
          - name: Checkout repository
            uses: actions/checkout@v4
            with:
              fetch-depth: 1

          - name: Run Claude PR Action
            uses: grll/claude-code-action@beta
            with:
              use_oauth: true
              claude_access_token: ${{ secrets.CLAUDE_ACCESS_TOKEN }}
              claude_refresh_token: ${{ secrets.CLAUDE_REFRESH_TOKEN }}
              claude_expires_at: ${{ secrets.CLAUDE_EXPIRES_AT }}

              timeout_minutes: "60"
              # Optional: add custom trigger phrase (default: @claude)
              # trigger_phrase: "/claude"
              # Optional: add assignee trigger for issues
              # assignee_trigger: "claude"
              # Optional: add custom environment variables (YAML format)
              # claude_env: |
              #   NODE_ENV: test
              #   DEBUG: true
              #   API_URL: https://api.example.com
              # Optional: limit the number of conversation turns
              # max_turns: "5"
    ```

## License

**Strict Non-Commercial Use License**

This code is strictly for personal and educational purposes only. Commercial use, including but not limited to selling, distributing, or incorporating this code into commercial products, is explicitly prohibited.

---

**Note:** This project is for educational and personal use. Please respect the terms of service of the Pollinations AI API and any included resources.
