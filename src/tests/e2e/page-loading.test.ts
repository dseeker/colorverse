import { test, expect } from "@playwright/test";

test.describe("Real Page Loading E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", msg => {
      if (msg.type() === "error") {
        console.error(`Browser Console Error:`, msg.text());
      }
      if (msg.type() === "warning") {
        console.warn(`Browser Console Warning:`, msg.text());
      }
    });

    page.on("request", request => {
      if (request.url().includes("pollinations.ai")) {
        console.log(`API Request: ${request.method()} ${request.url()}`);
      }
    });

    page.on("response", response => {
      if (response.url().includes("pollinations.ai")) {
        console.log(`API Response: ${response.status()} ${response.url()}`);
      }
    });
  });

  test("should load homepage successfully", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const title = await page.title();
    expect(title).toBeTruthy();

    const bodyContent = await page.content();
    expect(bodyContent).toContain("ColorVerse");
  });

  test("should load homepage without console errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", msg => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    expect(errors.length).toBe(0);
  });

  test("should make API requests to gen.pollinations.ai", async ({ page }) => {
    const apiRequests: string[] = [];

    page.on("request", request => {
      if (request.url().includes("gen.pollinations.ai")) {
        apiRequests.push(request.url());
      }
    });

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    expect(apiRequests.length).toBeGreaterThan(0);
    expect(apiRequests.every(url => url.includes("gen.pollinations.ai"))).toBe(true);
  });

  test("should include authentication headers in API requests", async ({ page, context }) => {
    const requests: any[] = [];

    await page.route("**/gen.pollinations.ai/**", async route => {
      const headers = route.request().headers();
      requests.push({
        url: route.request().url(),
        headers,
      });

      if (headers["authorization"]) {
        console.log(`✓ Auth header found: ${headers["authorization"].substring(0, 20)}...`);
      }
      return route.continue();
    });

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const textApiRequests = requests.filter((r: any) => r.url.includes("/chat/completions"));
    expect(textApiRequests.length).toBeGreaterThan(0);

    const authenticatedRequests = textApiRequests.filter((r: any) => r.headers["authorization"]);
    expect(authenticatedRequests.length).toBeGreaterThan(0);
  });
});
