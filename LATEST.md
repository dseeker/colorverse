# ColorVerse - Latest State & Context

## Current Status (February 13, 2026)

### Recent Changes Completed

#### 1. ✅ Debug System Overhaul

- **Added URL-based DEBUG_MODE**: Enable with `?debug=true`, `#debug`, or `?dev=true`
- **All console logs wrapped**: Uses `debug.log()` utility that only logs when DEBUG_MODE is enabled
- **Errors always show**: `console.error()` statements remain unwrapped for critical issues
- **Files changed**: `app.js` (lines 6-45 added debug utility)

#### 2. ✅ File Organization

- **Archived debug/ folder**: Moved 8 test scripts to `archive/debug/`
  - test-model-config.js, test-cheap-models.js, test-dynamic-categories.js
  - test-full-structure.js, test-clean-prompt.js, test-10items.js
  - test-reduced-structure.js, test-api.js
- **Archived standalone tools**: test-json-generator.js, generate-image.js → `archive/`
- **Updated .gitignore**: Added `*.code-workspace` exclusion

#### 3. ✅ Cache System Fixed

- **Duration**: Changed to 24 hours for all environments (was 10 min dev / 6 hrs prod)
- **Persistence**: Content now stays consistent throughout the day
- **Immediate save**: Front page data saved immediately after generation
- **Removed forced clearing**: No longer clears cache if < 25 categories

#### 4. ✅ Theme System Simplified

- **Uses Tailwind classes**: Removed custom CSS variables for light/dark themes
- **Standard dark mode**: `dark:` prefix classes on html element
- **Colorful theme**: Only custom theme, kept gradient CSS
- **Deterministic gradients**: Based on section title/id instead of random

#### 5. ✅ AI Model Configuration

- **Primary model**: `gemini-fast` (Gemini 2.0 Flash)
- **Fallback chain**: `mistral` → `nova-fast` → others
- **Removed**: `openai-large` from fetchFreshData (now uses default chain)
- **Configuration**: `src/services/aiProviderConfig.js`

#### 6. ✅ Deterministic Content

All random elements now use date/hash-based algorithms:

- **Featured categories**: Selected based on current date
- **Popular items**: Date-based shuffle instead of Math.random()
- **Related items**: Hash-based sorting
- **Gradient colors**: Title-based selection

#### 7. ✅ Error Fixes

- **searchManager.js**: Handles both array and object formats for category.items
- **performanceMonitor.js**: Try-catch around all performance marks
- **Data structure**: Updated to handle `item.title || item.name` everywhere

### File Structure

```
colorverse/
├── app.js                    # Main app (5,140 lines, DEBUG_MODE added)
├── index.html               # Main HTML (Tailwind + immediate theme script)
├── service-worker.js        # PWA service worker
├── service-worker-register.js # SW registration
├── openrouter.js            # OpenRouter API config
├── robots.txt               # SEO robots file
│
├── archive/                 # ARCHIVED FILES
│   ├── debug/              # 8 test scripts
│   ├── generate-image.js   # CLI image generator
│   └── test-json-generator.js # JSON structure tester
│
├── src/
│   └── services/
│       ├── aiProviderConfig.js    # Model configuration
│       ├── cacheManager.js        # IndexedDB cache
│       ├── coloringTipsManager.js # Tips system
│       ├── favoritesManager.js    # LocalStorage favorites
│       ├── imageLoader.js         # Lazy loading
│       ├── MultiProviderAIManager.js # AI provider fallback
│       ├── performanceMonitor.js  # Web Vitals monitoring
│       ├── searchManager.js       # Search functionality
│       └── seoManager.js          # SEO utilities
│
├── test/
│   ├── appFeatures.test.js
│   ├── utilityFunctions.test.js
│   ├── changeColoringStyle.test.js
│   ├── initStyleSelector.test.js
│   └── apiFunctions.test.js
│
└── docs/
    ├── AI-APIDOCS.md
    ├── DEVELOPMENT.md
    ├── POLLINATIONS_INTEGRATION.md
    ├── README.md
    ├── ROADMAP.md
    ├── TESTING-JSON-GENERATOR.md
    └── CHANGES.md (created today)
```

### Key URLs & Testing

**Debug Mode:**

```
http://localhost:4000/?debug=true
http://localhost:4000/#debug
http://localhost:4000/?dev=true
```

**Console Commands:**

```javascript
// Clear all caches
clearAllCache();

// Check debug mode
DEBUG_MODE;

// Test theme switching
applyTheme("dark");
applyTheme("light");
applyTheme("colorful");
```

### Environment Variables

Create `.env` file:

```bash
POLLINATIONS_API_KEY=your_key_here
```

### Current Issues

1. **Performance**: app.js is 5,140 lines - could be modularized (user wants to keep as is)
2. **Console logs**: ~43 console statements remain (mostly errors and important operational messages)
3. **Test coverage**: Tests exist but may need updates for new DEBUG_MODE system

### Model Fallback Chain

```javascript
const allModels = [
  "gemini-fast", // Primary: Gemini 2.0 Flash
  "mistral", // Fallback 1: Mistral Small 3.1 24B
  "nova-fast", // Fallback 2: Amazon Nova
  "openai", // GPT-4o Mini
  "openai-fast", // GPT-4.1 Nano
  "openai-large", // GPT-4o
  "gemini", // Gemini 2.5 Flash
  "llamascout", // Llama 4 Scout 17B
  "llama-roblox", // Llama 3.1 8B
  "phi", // Phi-4 Mini
  // ... (9 models total in chain)
];
```

### Cache Keys

```javascript
const CACHE_KEY_SITE_DATA = "colorverse-site-data";
const CACHE_KEY_TIMESTAMP = "colorverse-cache-timestamp";
const CACHE_KEY_IMAGE_URLS = "colorverse-image-urls";
```

### Image Generation

**Primary model**: `gptimage` (fallback to `flux`)
**Parameters**:

- Width: 400-800px (depending on use case)
- Height: 400-800px
- Seed: Deterministic based on categoryKey + itemKey
- Model: `gptimage` with `flux` fallback

### Next Steps / TODO

1. **Testing**: Verify DEBUG_MODE works correctly
2. **Documentation**: Update README.md with debug mode instructions
3. **Cleanup**: Remove or archive outdated .md files
4. **Performance**: Consider lazy loading for heavy components
5. **SEO**: Verify structured data is correct
6. **Service Worker**: Test offline functionality

### Dependencies

Check `package.json` for current dependencies. Key ones:

- Testing: Vitest, Playwright
- Linting: ESLint
- Build: (none - vanilla JS)

### Git Status

Run `git status` to see modified files. Currently modified:

- app.js (DEBUG_MODE added)
- index.html (theme system)
- .gitignore (updated)
- Various service files (fixes applied)

### Server Commands

```bash
# Start local server (choose one)
python3 -m http.server 4000
npx serve -l 4000
node server.js

# Test debug mode
open http://localhost:4000/?debug=true
```

### Important Functions

**In app.js:**

- `callAIAPI(prompt, preferredModel)` - AI API with fallback
- `generateSiteData()` - Main content generation
- `fetchFreshData()` - Fetch new data from AI
- `applyTheme(themeName)` - Apply light/dark/colorful theme
- `getImageUrl(prompt, params)` - Generate image URLs
- `saveToCache(data)` / `loadFromCache()` - Cache management

**In src/services/searchManager.js:**

- `buildSearchIndex(categories)` - Create search index
- `search(query)` - Perform search
- `calculateRelevance(item, terms)` - Score results

---

## How to Continue

1. **Test the current implementation**: Start server, test debug mode
2. **Fix any remaining issues**: Check console for errors
3. **Update documentation**: README.md, create LATEST.md (this file)
4. **Deploy**: Push to GitHub Pages when ready
5. **Monitor**: Check for any runtime errors after deployment

Last updated: February 13, 2026
