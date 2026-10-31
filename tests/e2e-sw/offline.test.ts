import { test, expect } from "@playwright/test";

for (const mount of ["/", "/colorverse/"]) {
  test(`real service worker caches migrated runtime offline at ${mount}`, async ({
    page,
    context,
    baseURL,
  }) => {
    const runtimeURL = new URL(`${mount}src/app.js`, baseURL).href;
    const indexURL = new URL(`${mount}index.html`, baseURL).href;
    const runtime = await page.request.get(runtimeURL);
    expect(runtime.ok()).toBe(true);
    const expectedRuntime = await runtime.text();
    expect(expectedRuntime.length).toBeGreaterThan(1000);

    // A minimal same-origin harness registers the unmodified worker without executing APIs.
    await page.goto(`${mount}sw-smoke.html#smoke`);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(
      new URL(`${mount}service-worker.js`, baseURL).href
    );
    const registrationScope = await page.evaluate(
      async () => (await navigator.serviceWorker.ready).scope
    );
    expect(registrationScope).toBe(new URL(mount, baseURL).href);

    // Installation must have precached the real source, not an HTML fallback or the old root path.
    await expect
      .poll(() =>
        page.evaluate(async url => {
          const cached = await caches.match(url);
          return cached ? await cached.text() : null;
        }, runtimeURL)
      )
      .toBe(expectedRuntime);
    expect(
      await page.evaluate(
        async url => !!(await caches.match(url)),
        new URL(`${mount}app.js`, baseURL).href
      )
    ).toBe(false);

    await context.setOffline(true);
    const offline = await page.evaluate(
      async ({ runtimeURL, indexURL }) => {
        const runtime = await fetch(runtimeURL);
        const index = await fetch(indexURL);
        return {
          runtimeStatus: runtime.status,
          runtimeType: runtime.headers.get("content-type"),
          runtime: await runtime.text(),
          indexStatus: index.status,
          index: await index.text(),
        };
      },
      { runtimeURL, indexURL }
    );
    expect(offline.runtimeStatus).toBe(200);
    expect(offline.runtimeType).toMatch(/javascript/);
    expect(offline.runtime).toBe(expectedRuntime);
    expect(offline.indexStatus).toBe(200);
    expect(offline.index).toContain('src="src/app.js"');
  });
}
