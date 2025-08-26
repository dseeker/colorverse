# Development Guide

## Codebase Overview

The project is a client-side web application that renders AI-generated coloring pages. The main files are:

- `index.html` – core page markup and theme switcher.
- `app.js` – application logic for fetching images and text, caching results, switching themes and styles, and handling route changes.
- `test/` – unit tests covering API helpers, theme logic, style switching, and other utilities.
- `test.html` – manual integration test page for exercising the Pollinations API from the browser.

## Running the App

Use the `npm start` script to serve the site locally on port 3000:

```bash
npm start
```

## Testing

Automated tests live in the `test/` directory and run with Node's built-in test runner. Execute them with:

```bash
npm test
```

The suite validates API fallbacks, theme handling, caching helpers, and other utility functions. Tests can be extended by adding new files under `test/`.

## Additional Documentation

- **POLLINATIONS_INTEGRATION.md** – guidance on securing and using the Pollinations API.
- **AI-APIDOCS.md** – detailed API reference.

Keep documentation up to date when changing the public API or major application flows.
