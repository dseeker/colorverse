import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "warn",
      "no-var": "warn",
      eqeqeq: ["error", "always"],
      curly: ["warn", "all"],
      "no-throw-literal": "warn",
      "no-useless-return": "warn",
      "no-constant-condition": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-debugger": "warn",
    },
  },
  // Cross-file globals shared between app.js ↔ src/modules/aiProviders.js
  {
    files: ["app.js", "src/modules/aiProviders.js", "src/services/*.js"],
    languageOptions: {
      globals: {
        debug: "readonly",
        REFERRER_ID: "readonly",
        showToast: "readonly",
        callAIAPI: "readonly",
        callOpenRouterAPI: "readonly",
        callGeminiAPI: "readonly",
        getAvailableProviders: "readonly",
        updateProviderStatus: "readonly",
        updateModelSuccess: "readonly",
        getOptimizedModelOrder: "readonly",
        trackApiCall: "readonly",
        getSuggestedDelay: "readonly",
        shouldDelayApiCall: "readonly",
        AI_PROVIDERS: "readonly",
        PROVIDER_PRIORITY: "readonly",
        PLACEHOLDER_IMAGE: "readonly",
      },
    },
  },
  // Service worker has its own global scope
  {
    files: ["service-worker.js"],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        clients: "readonly",
      },
    },
  },
  // Workers run in Cloudflare Workers runtime
  {
    files: ["workers/**/*.js"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["src/tests/**/*.ts", "**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.node,
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "output/**",
      "*.min.js",
      "eslint.config.js",
      "vitest.config.ts",
      "playwright.config.ts",
      "openrouter.js",
      "archive/**",
      ".llmhub/**",
    ],
  },
];
