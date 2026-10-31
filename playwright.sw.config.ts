import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4002";

export default defineConfig({
  testDir: "./tests/e2e-sw",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html"], ["list"]],
  use: {
    baseURL,
    serviceWorkers: "allow",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node tests/e2e-sw/server.js",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30000,
  },
});
