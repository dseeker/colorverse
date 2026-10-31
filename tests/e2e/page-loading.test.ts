import { test, expect } from "./fixtures";

test.describe("Local page loading", () => {
  for (const mount of ["/", "/colorverse/"]) {
    test(`loads migrated runtime and static assets at ${mount}`, async ({ page }) => {
      const responses: { path: string; status: number; type: string }[] = [];
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("response", response => {
        responses.push({
          path: new URL(response.url()).pathname,
          status: response.status(),
          type: response.headers()["content-type"] || "",
        });
      });

      await page.goto(mount);
      await expect(page.locator('a.category-card[href*="#category/"]').first()).toBeVisible();
      await expect(page).toHaveTitle(/ColorVerse/);
      await expect
        .poll(
          () => new Set(responses.filter(r => r.path.includes("/locales/")).map(r => r.path)).size
        )
        .toBe(3);

      for (const path of [
        "src/app.js",
        "src/data/palettes.js",
        "src/data/pencilSets.js",
        "locales/en/translation.json",
        "locales/de/translation.json",
        "locales/pt/translation.json",
      ]) {
        expect(responses).toContainEqual(
          expect.objectContaining({ path: `${mount}${path}`, status: 200 })
        );
      }
      expect(responses.find(r => r.path === `${mount}src/app.js`)?.type).toMatch(/javascript/);
      expect(errors).toEqual([]);

      await page.goto(`${mount}#palettes`);
      await expect(page.locator(".palette-fav-btn").first()).toBeVisible();
      await expect(page.locator("#language-selector option")).toHaveCount(3);
    });
  }

  test("clears cache and reloads using local data without text generation", async ({ page }) => {
    const textRequests: string[] = [];
    page.on("request", request => {
      if (request.url().includes("/chat/completions")) textRequests.push(request.url());
    });
    await page.goto("/");
    await expect(page.locator('a.category-card[href*="#category/"]').first()).toBeVisible();
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('a.category-card[href*="#category/"]').first()).toBeVisible();
    expect(textRequests).toEqual([]);
  });
});
