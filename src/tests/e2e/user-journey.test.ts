import { test, expect } from "@playwright/test";

test.describe("User Journey E2E Tests", () => {
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

  test("should browse categories and view items", async ({ page }) => {
    await page.goto("http://localhost:3000");

    await page.waitForLoadState("networkidle");

    const categoryCards = await page.locator(".category-card").all();
    expect(categoryCards.length).toBeGreaterThan(0);

    const firstCategory = categoryCards[0];
    await firstCategory.click();

    await page.waitForLoadState("networkidle");

    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
  });

  test("should view a coloring page", async ({ page }) => {
    await page.goto("http://localhost:3000");

    await page.waitForLoadState("networkidle");

    const firstCard = await page.locator(".category-card").first();
    await firstCard.click();

    await page.waitForLoadState("networkidle");

    const coloringImage = await page
      .locator("#coloring-image, img[src*='gen.pollinations.ai']")
      .first();
    await expect(coloringImage).toBeVisible({ timeout: 30000 });
  });

  test("should handle image loading with API calls", async ({ page, context }) => {
    const imageUrls: string[] = [];

    await page.route("**/*gen.pollinations.ai/**", async route => {
      const url = route.request().url();
      imageUrls.push(url);
      return route.continue();
    });

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    expect(imageUrls.length).toBeGreaterThan(0);
    expect(imageUrls.every(url => url.includes("gen.pollinations.ai"))).toBe(true);
  });

  test("should handle authentication in API requests", async ({ page, context }) => {
    const authRequests: any[] = [];

    await page.route("**/gen.pollinations.ai/v1/chat/completions", async route => {
      const headers = route.request().headers();

      if (headers["authorization"]) {
        authRequests.push({
          url: route.request().url(),
          hasAuth: true,
        });
      } else {
        authRequests.push({
          url: route.request().url(),
          hasAuth: false,
        });
      }

      return route.continue();
    });

    await page.goto("http://localhost:3000");

    await page.waitForLoadState("networkidle", { timeout: 120000 });

    const authenticated = authRequests.filter((r: any) => r.hasAuth);
    expect(authenticated.length).toBeGreaterThan(0);
  });

  test("should switch themes successfully", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const themeButtons = await page.locator('[id^="theme-"]').all();
    expect(themeButtons.length).toBeGreaterThan(0);

    await themeButtons[1].click();
    await page.waitForTimeout(500);

    const bodyClass = await page.locator("body").getAttribute("class");
    expect(bodyClass).toContain("theme-");
  });

  test("should navigate between pages", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const initialUrl = page.url();

    await page.goBack();
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toBe(initialUrl);
  });

  test("should handle errors gracefully", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", msg => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    const errorsAreMinimal = consoleErrors.filter(
      err => !err.includes("net::ERR") && !err.includes("404") && !err.includes("500")
    );

    expect(errorsAreMinimal.length).toBe(consoleErrors.length);
  });
});
