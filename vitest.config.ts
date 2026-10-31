import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // Include tests and the Cloudflare Workers (plain vitest,
    // KV/fetch mocked — no @cloudflare/vitest-pool-workers dependency needed).
    include: ["tests/**/*.test.{ts,js}", "workers/**/*.test.{ts,js}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      // Exclude Playwright E2E tests (run with `npm run test:e2e:playwright`)
      "tests/e2e/**",
      "tests/e2e-live/**",
      "tests/e2e-sw/**",
      // Exclude legacy Node.js test runner tests
      "test/**",
    ],
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
