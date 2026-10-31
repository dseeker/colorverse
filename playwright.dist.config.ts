import { defineConfig } from "@playwright/test";
import localConfig from "./playwright.config";

export default defineConfig({
  ...localConfig,
  webServer: {
    command: "npm run serve:dist",
    url: process.env.BASE_URL || "http://localhost:4000",
    // Never silently run built-output tests against an existing source server.
    reuseExistingServer: false,
    timeout: 120000,
  },
});
