import { test, expect, type Page } from "@playwright/test";

// The smoke page has no hash, so service-worker-register.js treats it as the homepage.
async function markDocument(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __docMarker: boolean }).__docMarker = true;
  });
}

const hasDocMarker = (page: Page) =>
  page.evaluate(() => (window as unknown as { __docMarker?: boolean }).__docMarker === true);

test("first install takeover does not reload the uncontrolled homepage", async ({ page }) => {
  let navigations = 0;
  page.on("framenavigated", frame => {
    if (frame === page.mainFrame()) navigations += 1;
  });

  await page.goto("/sw-smoke.html");
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(false);
  await markDocument(page);

  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  // A reload would be scheduled synchronously from controllerchange; give it a beat to show up.
  await page.waitForTimeout(500);

  expect(navigations).toBe(1);
  expect(await hasDocMarker(page)).toBe(true);
});

test("an updated worker taking over a controlled homepage still reloads it", async ({ page }) => {
  await page.goto("/sw-smoke.html");
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  // Load a page that starts out controlled, as a returning visitor would.
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await markDocument(page);

  expect((await page.request.get("/__sw-bump")).status()).toBe(204);
  const reloaded = page.waitForEvent("framenavigated", { timeout: 15000 });
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
  await reloaded;
  await page.waitForLoadState("domcontentloaded");

  expect(await hasDocMarker(page)).toBe(false);
});
