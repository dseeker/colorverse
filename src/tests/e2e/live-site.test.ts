import { test, expect } from "@playwright/test";

// Live-site smoke tests against the deployed GitHub Pages site.
// Verifies the Option A architecture: site-data served from the worker /data
// route (no client-side gen.pollinations.ai text-gen calls), images flow
// through the image-proxy worker, and core user flows work end-to-end.

const LIVE_URL = process.env.LIVE_URL || "https://dseeker.github.io/colorverse/";
const WORKER_HOST = "colorverse-image-proxy.daniel-bca.workers.dev";

test.describe("Live site end-to-end", () => {
  test("home loads and serves site-data.json from the worker /data route", async ({ page }) => {
    const dataRequests: string[] = [];
    const pollinationsTextRequests: string[] = [];

    page.on("response", response => {
      const url = response.url();
      if (url.includes(`${WORKER_HOST}/data`)) {
        dataRequests.push(`${response.status()} ${url}`);
      }
      if (url.includes("gen.pollinations.ai/v1/chat/completions")) {
        pollinationsTextRequests.push(`${response.status()} ${url}`);
      }
    });

    await page.goto(LIVE_URL);
    await page.waitForLoadState("networkidle");

    // Page should render with ColorVerse branding
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    const body = await page.content();
    expect(body).toContain("ColorVerse");

    // The static-data worker route must have been hit (Option A)
    expect(dataRequests.length).toBeGreaterThan(0);
    expect(dataRequests.every(r => r.startsWith("200"))).toBe(true);

    // No client-side chat-completion calls should happen on first paint —
    // site-data.json is served from the worker, not generated live.
    expect(pollinationsTextRequests.length).toBe(0);
  });

  test("home shows category cards from the cached site-data", async ({ page }) => {
    await page.goto(LIVE_URL);
    await page.waitForLoadState("networkidle");

    const cards = page.locator(".category-card");
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(5);
  });

  test("category navigation renders item list", async ({ page }) => {
    await page.goto(LIVE_URL);
    await page.waitForLoadState("networkidle");

    const firstCard = page.locator(".category-card").first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });
    await firstCard.click();

    // Category page renders async; wait for item cards (not the loading spinner).
    const items = page.locator('a.category-card[href*="#item/"]');
    await expect(items.first()).toBeVisible({ timeout: 30000 });
    const itemCount = await items.count();
    expect(itemCount).toBeGreaterThan(0);
  });

  test("clicking an item triggers an image load via the worker proxy", async ({ page }) => {
    const imageRequests: string[] = [];

    page.on("request", request => {
      const url = request.url();
      if (url.includes(WORKER_HOST) && url.includes("prompt=")) {
        imageRequests.push(url);
      }
    });

    await page.goto(LIVE_URL);
    await page.waitForLoadState("networkidle");

    const card = page.locator(".category-card").first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();

    // Wait for item cards to render on the category page.
    const item = page.locator('a.category-card[href*="#item/"]').first();
    await expect(item).toBeVisible({ timeout: 30000 });
    await item.click();

    // Wait for the coloring image to render (worker image-proxy request)
    const coloringImage = page.locator("#coloring-image");
    await expect(coloringImage).toBeVisible({ timeout: 60000 });

    // At least one image request should have gone through the worker
    const tries = imageRequests.length;
    expect(tries).toBeGreaterThan(0);

    // The image element should have a non-empty src pointing at the worker
    const src = await coloringImage.getAttribute("src");
    expect(src).toBeTruthy();
    expect(src).toContain(WORKER_HOST);
  });

  test("no console errors on home load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", msg => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", err => errors.push(err.message));

    await page.goto(LIVE_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Filter out pre-existing issues unrelated to this work:
    // - service-worker.js 404: GitHub Pages serves from /colorverse/, but the
    //   SW is registered with an absolute /service-worker.js path that lands
    //   outside the project scope. Pre-existing.
    // - favicon, third-party cookie, deprecation noise.
    const realErrors = errors.filter(
      e =>
        !e.includes("favicon") &&
        !e.includes("third-party cookie") &&
        !e.includes("Deprecation") &&
        !e.includes("service-worker.js") &&
        !e.includes("Service Worker registration failed")
    );
    expect(realErrors).toEqual([]);
  });
});
