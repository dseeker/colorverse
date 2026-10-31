import { test as base, expect, type Page } from "@playwright/test";

const defaultSiteData = {
  brand: { name: "ColorVerse", tagline: "Local coloring pages" },
  seasonal_gallery: {
    title: "Seasonal Collection",
    description: "Seasonal coloring pages",
    items: {
      seasonal_1: { title: "Maple Leaves", description: "Autumn maple leaves." },
    },
  },
  categories: {
    animals: {
      title: "Animal Kingdom",
      description: "Friendly animals to color.",
      keywords: ["animals", "pets"],
      items: {
        animals_item_1: { title: "Sunny Puppy", description: "A friendly puppy." },
        animals_item_2: { title: "Window Cat", description: "A cat by a window." },
      },
    },
  },
};

const image =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="white"/></svg>';

// Keep local E2E runs independent of CDN availability and billable worker APIs.
async function installLocalFixtures(page: Page, baseURL: string, data: unknown) {
  const origin = new URL(baseURL).origin;
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) {
      if (url.pathname.endsWith("/site-data.json")) {
        await route.fulfill({ json: data });
        return;
      }
      // Emulate a GitHub Pages mount while serving real files from the root.
      if (url.pathname.startsWith("/colorverse/")) {
        const response = await route.fetch({
          url: `${origin}${url.pathname.slice("/colorverse".length)}${url.search}`,
        });
        await route.fulfill({ response });
      } else {
        await route.continue();
      }
      return;
    }
    if (url.pathname === "/data" || url.pathname === "/catalog") {
      await route.fulfill({ json: data });
    } else if (url.hostname === "cdn.tailwindcss.com") {
      await route.fulfill({ contentType: "application/javascript", body: "window.tailwind = {};" });
    } else if (url.pathname.includes("i18next")) {
      await route.fulfill({
        contentType: "application/javascript",
        body: `window.i18next = {
          language: "en", resources: {},
          async init(options) { this.language = options.lng; this.resources = options.resources; },
          async changeLanguage(language) { this.language = language; },
          t(key, params = {}) {
            const dict = this.resources[this.language]?.translation || {};
            let value = dict[key] || key.split(".").reduce((value, part) => value?.[part], dict) || key;
            for (const [name, replacement] of Object.entries(params)) {
              value = value.replaceAll("{{" + name + "}}", String(replacement));
            }
            return value;
          }
        };`,
      });
    } else if (route.request().resourceType() === "image") {
      await route.fulfill({ contentType: "image/svg+xml", body: image });
    } else if (route.request().resourceType() === "stylesheet") {
      await route.fulfill({ contentType: "text/css", body: ".hidden { display: none; }" });
    } else {
      await route.fulfill({ json: {} });
    }
  });
}

export const test = base.extend<{ siteData: unknown }>({
  siteData: [defaultSiteData, { option: true }],
  page: async ({ page, baseURL, siteData }, use) => {
    await installLocalFixtures(page, baseURL!, siteData);
    await use(page);
  },
});

export { expect };
