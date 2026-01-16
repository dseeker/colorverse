import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    // Only include tests from src/tests, exclude Playwright E2E tests
    include: ["src/tests/**/*.test.{ts,js}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      // Exclude Playwright E2E tests (run with `npm run test:e2e:playwright`)
      "src/tests/e2e/**",
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
