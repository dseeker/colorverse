# ColorVerse Project Structure

## 📁 Directory Layout

```
colorverse/
├── 📄 Core Application
│   ├── index.html              # Main HTML file
│   ├── app.js                  # Main application logic
│   ├── generate-image.js       # Image generation utilities
│   ├── openrouter.js          # OpenRouter API integration
│   ├── service-worker.js      # Service worker for PWA
│   └── service-worker-register.js
│
├── 📚 Documentation
│   ├── README.md              # Project overview (root)
│   ├── ROADMAP.md            # Feature roadmap (root)
│   └── docs/                 # Detailed documentation folder
│       ├── README.md         # Documentation index
│       ├── PROJECT_STRUCTURE.md  # This file
│       ├── DEVELOPMENT.md    # Development guide
│       ├── AI-APIDOCS.md     # Current API documentation
│       ├── POLLINATIONS_INTEGRATION.md  # API integration guide
│       ├── FINDINGS.md       # Development findings & decisions
│       ├── CACHE_IMPLEMENTATION_SUMMARY.md  # Cache system docs
│       ├── MODEL-TESTING-RESULTS.md  # Model comparison results
│       ├── PROMPT-IMPROVEMENTS.md # Prompt engineering notes
│       └── CLEANUP_SUMMARY.md # Organization history
│
├── ⚙️ Configuration
│   ├── package.json           # Node dependencies
│   ├── eslint.config.js       # Linting rules
│   ├── playwright.config.ts   # E2E testing config
│   ├── vitest.config.ts       # Unit testing config
│   └── robots.txt            # SEO configuration
│
├── 🧪 Testing
│   ├── test-json-generator.js # Reference JSON generator (standalone)
│   └── test/                 # Test suites
│
├── 🔧 Debug & Tools
│   └── debug/                # Testing utilities & archived tests
│       ├── README.md         # Debug tools documentation
│       ├── test-cheap-models.js      # Model cost/quality comparison
│       ├── test-model-config.js      # Model configuration validator
│       ├── test-cache-status.html    # Cache UI testing
│       ├── verify-cache-implementation.sh
│       ├── models.json       # Full model list with pricing
│       └── [archived tests]  # Historical test files
│
├── 📦 Source Code (if using modules)
│   └── src/
│       └── services/
│           └── aiProviderConfig.js  # AI provider configuration
│
└── 📊 Build & Output
    ├── coverage/             # Test coverage reports
    ├── output/              # Generated output files
    ├── test-results/        # Test results
    └── playwright-report/   # E2E test reports
```

## 🎯 Key Files

### Production Files
- **index.html** - Main application entry point
- **app.js** - Core application logic with caching & routing
- **service-worker.js** - PWA support & offline functionality

### API Integration
- **src/services/aiProviderConfig.js** - AI provider configuration
  - Primary: qwen-coder ($0.22/M)
  - Fallback 1: nova-fast ($0.14/M)
  - Fallback 2: mistral ($0.30/M)

### Testing
- **test-json-generator.js** - Standalone reference implementation
- **debug/** - Development & testing utilities

### Documentation
- **docs/README.md** - Documentation index & guide
- **docs/AI-APIDOCS.md** - Current API reference (Pollinations v3)
- **docs/CACHE_IMPLEMENTATION_SUMMARY.md** - Cache system details
- **docs/FINDINGS.md** - Development decisions & optimizations
- **docs/PROJECT_STRUCTURE.md** - This file

## 🚀 Quick Commands

```bash
# Run tests
npm test

# Start development server
npm run dev

# Run linter
npm run lint

# Test model configuration
node debug/test-model-config.js

# Compare all models
node debug/test-cheap-models.js

# Verify cache implementation
bash debug/verify-cache-implementation.sh
```

## 📝 File Organization Rules

1. **Core application files** - Root directory
2. **Documentation** - `.md` files in root
3. **Testing utilities** - `debug/` folder
4. **Test suites** - `test/` folder
5. **Build artifacts** - `coverage/`, `output/`, etc.

## 🔄 Maintenance

- Keep root clean - only essential files
- Archive old tests in `debug/`
- Update documentation when adding features
- Use descriptive names with prefixes: `test-`, `debug-`, etc.

