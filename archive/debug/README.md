# Debug & Testing Tools

This folder contains legacy testing utilities and debugging tools retained for
reference. They may contact live APIs and use outdated models or source-layout
assumptions; they are not part of the default test suite. Current tests live in
`tests/` and `workers/`. See [Development](../../docs/DEVELOPMENT.md).

## 🔧 Legacy Testing Tools

### Model Testing

- **`test-cheap-models.js`** - Tests and compares 10 cheapest AI models by cost/quality ratio
  - Usage: `node archive/debug/test-cheap-models.js`
  - Tests with full ColorVerse prompt
  - Shows quality comparison and sample outputs
  - Used to determine optimal model configuration

- **`test-model-config.js`** - Quick verification test for current model configuration
  - Usage: `node archive/debug/test-model-config.js`
  - Tests qwen-coder, nova-fast, mistral
  - Validates models work with JSON mode

- **`models.json`** - Full model list from Pollinations API with pricing
  - Fetched from: `https://gen.pollinations.ai/text/models`
  - Contains pricing, capabilities, and descriptions

### UI Testing

- **`test-cache-status.html`** - Interactive test for cache status indicator UI
  - Open in browser to test different indicator states
  - Tests: Loading, Cached, Refreshing, Hidden states
  - Validates animations and styling

### Validation

- **`verify-cache-implementation.sh`** - Verifies cache implementation is correct
  - Usage: `bash archive/debug/verify-cache-implementation.sh`
  - Checks: 24hr cache, status indicator, model config
  - Quick validation after changes

## 📦 Archived Test Files

These are older test scripts kept for reference:

- **`../test-json-generator.js`** - Original standalone JSON generator test; run
  `node archive/test-json-generator.js` from the repository root (legacy, live API).
  For the current mocked integration suite and live opt-in, see
  [JSON generator testing](../../docs/TESTING-JSON-GENERATOR.md).
- **`test-10items.js`** - Old test for 10-item structure
- **`test-api.js`** - Basic API connection test
- **`test-clean-prompt.js`** - Clean prompt testing
- **`test-dynamic-categories.js`** - Dynamic category generation test
- **`test-full-structure.js`** - Full 25-category structure test
- **`test-reduced-structure.js`** - Reduced structure test

## 🎨 Development Tools

- **`ai-playground.html`** - Interactive AI testing playground
- **`model-test.html`** - Model testing interface
- **`test.html`** - Basic HTML test file

## 📊 Usage

### Test Current Model Configuration

```bash
node archive/debug/test-model-config.js
```

### Compare All Cheap Models

```bash
node archive/debug/test-cheap-models.js
```

### Verify Cache Implementation

```bash
bash archive/debug/verify-cache-implementation.sh
```

### Test Cache UI

```bash
open archive/debug/test-cache-status.html
```

## 🔄 Maintenance

Add new automated tests under `tests/` or the relevant worker, not this archive.
Keep historical tools clearly labeled as legacy and use repository-root paths in
usage examples.
