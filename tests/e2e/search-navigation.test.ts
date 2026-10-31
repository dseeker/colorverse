import { test, expect } from "./fixtures";

test.describe("Search hash navigation", () => {
  let pageErrors: string[];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
  });

  test.afterEach(() => {
    expect(pageErrors).toEqual([]);
  });

  test("native search link retains its hash and survives back/forward", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#main-content a[href='#category/animals']").first()).toBeVisible();
    // Local fixtures omit Tailwind's responsive overrides for the header.
    // Native click still exercises the anchor's default hash navigation.
    await page.locator('a[href="#search"]').evaluate(link => (link as HTMLElement).click());
    await expect(page).toHaveURL(/#search$/);
    await expect(page.locator("#search-form")).toBeVisible();
    await page.goBack();
    await expect(page).not.toHaveURL(/#search/);
    await expect(page.locator("#search-form")).toHaveCount(0);
    await page.goForward();
    await expect(page).toHaveURL(/#search$/);
    await expect(page.locator("#search-form")).toBeVisible();
  });

  test("repeated same-query submits keep the form wired and history intact", async ({ page }) => {
    await page.goto("/#search");
    await expect(page.locator("#search-form")).toBeVisible();
    await page.locator("#search-page-input").fill("cat");
    await page.locator("#search-form button").click();
    await expect(page).toHaveURL(/#search\?q=cat$/);
    await expect(page.locator("#main-content")).toContainText("Window Cat");
    for (let i = 0; i < 2; i++) {
      const oldForm = await page.locator("#search-form").elementHandle();
      await page.locator("#search-form button").click();
      await expect.poll(() => oldForm!.evaluate(form => form.isConnected)).toBe(false);
      await expect(page.locator("#search-form")).toBeVisible();
      await expect(page).toHaveURL(/#search\?q=cat$/);
    }
    await page.locator("#search-page-input").fill("puppy");
    await page.locator("#search-form button").click();
    await expect(page).toHaveURL(/#search\?q=puppy$/);
    await expect(page.locator("#main-content")).toContainText("Sunny Puppy");
    await page.goBack();
    await expect(page.locator("#search-page-input")).toHaveValue("cat");
    await page.goBack();
    await expect(page).toHaveURL(/#search$/);
    await expect(page.locator("#search-page-input")).toHaveValue("");
    await page.goForward();
    await expect(page.locator("#search-page-input")).toHaveValue("cat");
  });

  test("header button, Enter and debounce use the same router", async ({ page }) => {
    await page.goto("/");
    await expect
      .poll(() => page.evaluate(() => !!(window as any).SearchManager?.searchInput))
      .toBe(true);
    // The header input is intentionally hidden on mobile; exercise its native
    // handlers there as well without changing production responsive styles.
    await page.locator("#search-input").evaluate(input => {
      (input as HTMLInputElement).value = "cat";
    });
    await page.locator("#search-btn").evaluate(button => (button as HTMLElement).click());
    await expect(page).toHaveURL(/#search\?q=cat$/);
    await expect(page.locator("#search-form")).toBeVisible();
    await expect(page.locator("#main-content")).toContainText("Window Cat");
    await page.locator("#search-input").evaluate(input => {
      (input as HTMLInputElement).value = "puppy";
      input.dispatchEvent(new KeyboardEvent("keypress", { key: "Enter", bubbles: true }));
    });
    await expect(page).toHaveURL(/#search\?q=puppy$/);
    await expect(page.locator("#main-content")).toContainText("Sunny Puppy");
    await page.locator("#search-input").evaluate(input => {
      (input as HTMLInputElement).value = "animals";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page).toHaveURL(/#search\?q=animals$/);
    await expect(page.locator("#search-form")).toBeVisible();
    await page.goBack();
    await expect(page.locator("#search-page-input")).toHaveValue("puppy");
    await page.goForward();
    await expect(page.locator("#search-page-input")).toHaveValue("animals");
  });

  test("query deep links decode URL parameters and remain reloadable", async ({ page }) => {
    await page.goto("/#search?q=Window+Cat");
    await expect(page.locator("#search-page-input")).toHaveValue("Window Cat");
    await expect(page.locator("#main-content")).toContainText("Window Cat");
    await expect(page.locator("#search-input")).toHaveValue("Window Cat");
    await page.reload();
    await expect(page).toHaveURL(/#search\?q=Window\+Cat$/);
    await expect(page.locator("#search-page-input")).toHaveValue("Window Cat");
    await page.locator("#search-page-input").fill("zzzznonexistent");
    await page.locator("#search-form button").click();
    await expect(page).toHaveURL(/#search\?q=zzzznonexistent$/);
    await expect(page.locator("#main-content a[href='#']")).toHaveCount(2);
    await page.goBack();
    await expect(page.locator("#search-page-input")).toHaveValue("Window Cat");
  });
});
