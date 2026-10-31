import { test, expect, type Page } from "@playwright/test";

const LIVE_URL = process.env.LIVE_URL || "https://dseeker.github.io/colorverse/";
const WORKER_HOST = "colorverse-image-proxy.daniel-bca.workers.dev";
const CONTENT_HOST = "colorverse-content-api.daniel-bca.workers.dev";
const CATEGORY_LINKS = 'a.category-card[href^="#category/"]';
const ITEM_LINKS = 'a.category-card[href^="#item/"]';

async function openHome(page: Page) {
  await page.goto(LIVE_URL, { waitUntil: "domcontentloaded" });
  await expect(page.locator(CATEGORY_LINKS).first()).toBeVisible({ timeout: 60000 });
}

async function openItem(page: Page) {
  await openHome(page);
  await page.locator(CATEGORY_LINKS).first().click();
  await expect(page.locator(ITEM_LINKS).first()).toBeVisible({ timeout: 60000 });
  await page.locator(ITEM_LINKS).first().click();
  await expect(page.locator("#coloring-image")).toBeVisible({ timeout: 60000 });
}

async function revealSettings(page: Page) {
  if (!(await page.locator("#theme-dark").isVisible())) {
    await page.locator("#mobile-menu-toggle").click();
  }
}

test.describe("Live site end-to-end", () => {
  test.setTimeout(120000);

  test("home loads a worker catalog without client-side text generation", async ({ page }) => {
    const dataResponses: number[] = [];
    const textRequests: string[] = [];
    page.on("response", response => {
      const url = new URL(response.url());
      if (
        (url.hostname === CONTENT_HOST && url.pathname === "/catalog") ||
        (url.hostname === WORKER_HOST && url.pathname === "/data")
      ) {
        dataResponses.push(response.status());
      }
    });
    page.on("request", request => {
      if (request.url().includes("gen.pollinations.ai/v1/chat/completions")) {
        textRequests.push(request.url());
      }
    });
    await openHome(page);
    expect(await page.title()).toContain("ColorVerse");
    expect(dataResponses).toContain(200);
    expect(textRequests).toEqual([]);
    expect(await page.locator(CATEGORY_LINKS).count()).toBeGreaterThan(5);
  });

  test("category navigation renders item links", async ({ page }) => {
    await openHome(page);
    await page.locator(CATEGORY_LINKS).first().click();
    await expect(page.locator(ITEM_LINKS).first()).toBeVisible({ timeout: 60000 });
    await expect(page).toHaveURL(/#category\//);
  });

  test("item image loads actual worker bytes and exposes a download", async ({ page }) => {
    await openItem(page);
    const image = page.locator("#coloring-image");
    await expect
      .poll(
        () =>
          image.evaluate(
            (img: HTMLImageElement, host) =>
              img.complete && img.naturalWidth > 1 && img.currentSrc.includes(host),
            WORKER_HOST
          ),
        { timeout: 90000 }
      )
      .toBe(true);
    const download = page.locator("a[download]").first();
    await expect(download).toHaveAttribute("href", new RegExp(WORKER_HOST));
    const response = await page.request.get((await download.getAttribute("href"))!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/image\/(jpeg|png|webp)/);
    expect((await response.body()).byteLength).toBeGreaterThan(1024);
  });

  test("favorites persist across reload and can be removed", async ({ page }) => {
    await openItem(page);
    const favorite = page.locator('button[id^="favorite-toggle-"]');
    await favorite.click();
    await expect(favorite).toContainText(/remove/i, { timeout: 15000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(favorite).toContainText(/remove/i, { timeout: 60000 });
    await favorite.click();
    await expect(favorite).toContainText(/add/i);
  });

  test("theme and language controls persist preferences", async ({ page }) => {
    await openHome(page);
    await revealSettings(page);
    await page.locator("#theme-dark").click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator(CATEGORY_LINKS).first()).toBeVisible({ timeout: 60000 });
    await revealSettings(page);
    await page.locator("#theme-light").click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.locator("#language-selector").selectOption("de");
    await expect(page.locator("#search-input")).toHaveAttribute(
      "placeholder",
      "Malvorlagen durchsuchen...",
      { timeout: 60000 }
    );
    await revealSettings(page);
    await page.locator("#language-selector").selectOption("pt");
    await expect(page.locator("#search-input")).toHaveAttribute(
      "placeholder",
      "Pesquisar páginas para colorir...",
      { timeout: 60000 }
    );
    await revealSettings(page);
    await page.locator("#language-selector").selectOption("en");
    await expect(page.locator("#search-input")).toHaveAttribute(
      "placeholder",
      "Search coloring pages...",
      { timeout: 60000 }
    );
  });

  test("search finds catalog items and handles unmatched queries", async ({ page }) => {
    await openHome(page);
    await page.locator('a[href="#search"]').first().click();
    await expect(page.locator("#search-page-input")).toBeVisible({ timeout: 15000 });
    await page.locator("#search-page-input").fill("flowers");
    await page.locator("#search-form").evaluate((form: HTMLFormElement) => form.requestSubmit());
    await expect(page.locator("#main-content .category-card").first()).toBeVisible();
    await expect(page).toHaveURL(/#search\?q=flowers/);
    await page.locator('a[href="#search"]').first().click();
    await expect(page.locator("#search-page-input")).toBeVisible({ timeout: 15000 });
    await page.locator("#search-page-input").fill("zzzznonexistent123");
    await page.locator("#search-form").evaluate((form: HTMLFormElement) => form.requestSubmit());
    await expect(page.locator("#main-content")).toContainText(/no results/i);
  });

  test("search deep links and browser history preserve the active route", async ({ page }) => {
    await page.goto(`${LIVE_URL}#search?q=flowers`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#search-page-input")).toHaveValue("flowers", {
      timeout: 60000,
    });
    await expect(page.locator("#main-content .category-card").first()).toBeVisible();
    await page.locator('a[href="#search"]').first().click();
    await expect(page.locator("#search-page-input")).toHaveValue("");
    await page.goBack();
    await expect(page.locator("#search-page-input")).toHaveValue("flowers");
    await page.goForward();
    await expect(page.locator("#search-page-input")).toHaveValue("");
    await expect(page).toHaveURL(/#search$/);
  });

  test("catalog remains accessible after service-worker takeover and reload", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
    await openHome(page);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(CATEGORY_LINKS).first()).toBeVisible({ timeout: 60000 });
    const catalog = await page.evaluate(async host => {
      const response = await fetch(`https://${host}/catalog?style=&seed=`, {
        headers: { "X-ColorVerse-UID": "live-regression-check" },
      });
      const data = await response.json();
      return { status: response.status, categories: Object.keys(data.categories || {}).length };
    }, CONTENT_HOST);
    expect(catalog.status).toBe(200);
    expect(catalog.categories).toBeGreaterThan(5);
    expect(errors).toEqual([]);
  });

  test("palette overlay opens a detail and closes without leaving the page", async ({ page }) => {
    await openHome(page);
    const url = page.url();
    await page.getByRole("button", { name: "Color Palettes", exact: true }).click();
    await expect(page.locator("#palettes-modal")).toBeVisible();
    await page.locator('#palettes-modal button[onclick*="openPaletteDetail"]').first().click();
    await expect(page.locator("#palettes-content h3")).toHaveText("Sunset");
    await expect(page.locator("#palettes-content")).toContainText("Color Swatches");
    await page.locator("#palettes-close").click();
    await expect(page.locator("#palettes-modal")).toHaveCount(0);
    expect(page.url()).toBe(url);
  });

  test("share fallback opens and closes without publishing", async ({ page }) => {
    await openItem(page);
    // Avoid opening an OS share sheet or posting to a social account.
    await page.evaluate(() => {
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    });
    await page.locator('button[onclick^="sharePage"]').click();
    await expect(page.locator("#share-modal")).toBeVisible();
    await expect(page.locator("#share-modal-copy")).toBeVisible();
    await page.locator("#share-modal-close").click();
    await expect(page.locator("#share-modal")).toHaveCount(0);
  });

  test("home has no runtime, HTTP, or service-worker errors", async ({ page }) => {
    const errors: string[] = [];
    const failedRequests: string[] = [];
    page.on("console", msg => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", err => errors.push(err.message));
    page.on("requestfailed", req => {
      // Navigation and service-worker takeover can cancel in-flight requests.
      if (/ERR_ABORTED|cancelled/i.test(req.failure()?.errorText || "")) return;
      failedRequests.push(`${req.url()} (${req.failure()?.errorText})`);
    });
    page.on("response", res => {
      if (res.status() >= 400) failedRequests.push(`${res.url()} (HTTP ${res.status()})`);
    });
    await openHome(page);
    await page.waitForTimeout(2000);
    expect(failedRequests).toEqual([]);
    expect(errors).toEqual([]);
  });
});
