# ColorVerse Project Structure

## 📁 Directory Layout

This archived reference uses the current directory names for navigation. For the
maintained overview, see [Architecture](../../../docs/ARCHITECTURE.md) and
[README](../../../README.md). Historical model choices below are not current defaults.

```
colorverse/
├── 📄 Core Application
│   ├── index.html              # Main HTML file
│   ├── src/app.js              # Main browser application logic
│   ├── service-worker.js      # Service worker for PWA
│   └── service-worker-register.js
│
├── 📚 Documentation
│   ├── README.md              # Project overview (root)
│   └── docs/                 # Project documentation
│       ├── DEVELOPMENT.md    # Development guide
│       ├── ROADMAP.md        # Feature roadmap
│       ├── ARCHITECTURE.md   # System architecture
│       └── ...               # API, analytics, testing, and contributor docs
│
├── ⚙️ Configuration
│   ├── package.json           # Node dependencies
│   ├── eslint.config.js       # Linting rules
│   ├── playwright.config.ts   # E2E testing config
│   ├── playwright.live.config.ts # Opt-in remote E2E config
│   ├── vitest.config.ts       # Unit testing config
│   └── robots.txt            # SEO configuration
│
├── 🧪 Testing
│   ├── tests/                # Unit, integration, build and browser suites
│   └── workers/*/test/       # Worker suites
│
├── 🔧 Debug & Tools
│   └── archive/              # Legacy scripts, not active app code
│       ├── generate-image.js
│       ├── openrouter.js
│       ├── test-json-generator.js # Legacy standalone generator
│       └── debug/            # Historical debug tools
│       ├── README.md         # Debug tools documentation
│       ├── test-cheap-models.js      # Model cost/quality comparison
│       ├── test-model-config.js      # Model configuration validator
│       ├── test-cache-status.html    # Cache UI testing
│       ├── verify-cache-implementation.sh
│       ├── models.json       # Full model list with pricing
│       └── [archived tests]  # Historical test files
│
├── 📦 Source Code & Build Tooling
│   └── src/
│       ├── modules/
│       ├── data/
│       └── services/
│           └── aiProviderConfig.js  # AI provider configuration
│   └── scripts/build.js      # Optional generation or offline packaging
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
- **src/app.js** - Core application logic with caching & routing
- **service-worker.js** - PWA support & offline functionality

### API Integration

- **src/services/aiProviderConfig.js** - AI provider configuration
  - Primary: qwen-coder ($0.22/M)
  - Fallback 1: nova-fast ($0.14/M)
  - Fallback 2: mistral ($0.30/M)

### Testing

- **archive/test-json-generator.js** - Legacy live standalone reference
- **tests/** - Current automated suites
- **archive/debug/** - Legacy development & testing utilities

### Documentation

- **README.md** - Documentation index & guide (root)
- **docs/AI-APIDOCS.md** - Current API reference (Pollinations v3)
- **archive/debug/archive/CACHE_IMPLEMENTATION_SUMMARY.md** - Historical cache notes
- **archive/debug/archive/FINDINGS.md** - Historical development decisions
- **archive/debug/archive/PROJECT_STRUCTURE.md** - This archived reference

## 🚀 Quick Commands

```bash
# Run tests
npm test

# Start development server
npm run dev

# Run linter
npm run lint

# Test model configuration
node archive/debug/test-model-config.js

# Compare all models
node archive/debug/test-cheap-models.js

# Verify cache implementation
bash archive/debug/verify-cache-implementation.sh
```

## 📝 File Organization Rules

1. **Core application files** - `index.html` at root, browser logic in `src/`
2. **Documentation** - `.md` files in `docs/`, except the root `README.md`
3. **Legacy testing utilities** - `archive/debug/` folder
4. **Test suites** - `tests/` and worker test folders
5. **Build artifacts** - `coverage/`, `output/`, etc.

## 🔄 Maintenance

- Keep root clean - only essential files
- Keep old debug tools in `archive/debug/`
- Update documentation when adding features
- Use descriptive names with prefixes: `test-`, `debug-`, etc.
