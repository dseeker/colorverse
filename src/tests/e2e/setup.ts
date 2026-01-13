import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  pages: async ({ page }, use) => {
    await use({
      homePage: new HomePage(page),
      categoryPage: new CategoryPage(page),
      itemPage: new ItemPage(page),
    });
  },
});

class HomePage {
  constructor(page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto("/");
  }

  async getFeaturedCategories() {
    return this.page.locator(".category-card");
  }

  async getCategoryCard(title) {
    return this.page.locator(`.category-card:has-text("${title}")`);
  }

  async getDailyPickSection() {
    return this.page.locator('section:has-text("Today\'s Special")');
  }

  async getSeasonalGallery() {
    return this.page.locator('section:has-text("Seasonal")');
  }

  async clickCategory(categoryName) {
    await this.getCategoryCard(categoryName).click();
  }

  async selectColoringStyle(style) {
    await this.page.click('button:has-text("Coloring Style")');
    await this.page.click(`button:has-text("${style}")`);
  }

  async switchTheme(themeName) {
    const themeButton = this.page.locator(`#theme-${themeName}`);
    await themeButton.click();
  }
}

class CategoryPage {
  constructor(page) {
    this.page = page;
  }

  async getCategoryTitle() {
    return this.page.locator("h2").textContent();
  }

  async getItems() {
    return this.page.locator(".category-card");
  }

  async getItemByTitle(title) {
    return this.page.locator(`.category-card:has-text("${title}")`);
  }

  async clickItem(title) {
    await this.getItemByTitle(title).click();
  }

  async nextPage() {
    await this.page.click('button:has-text("Next")');
  }

  async previousPage() {
    await this.page.click('button:has-text("Previous")');
  }

  async selectSort(sortBy) {
    await this.page.click('select[name="sort"]');
    await this.page.click(`option[value="${sortBy}"]`);
  }
}

class ItemPage {
  constructor(page) {
    this.page = page;
  }

  async getImage() {
    return this.page.locator("#coloring-image");
  }

  async getTitle() {
    return this.page.locator("h1").textContent();
  }

  async getDownloadButton() {
    return this.page.locator('a:has-text("Download")');
  }

  async getPrintButton() {
    return this.page.locator('button:has-text("Print")');
  }

  async clickDownload() {
    await this.getDownloadButton().click();
  }

  async clickPrint() {
    this.page.on("dialog", dialog => dialog.accept());
    await this.getPrintButton().click();
  }

  async getRelatedItems() {
    return this.page.locator(".related-items .category-card");
  }

  async clickRelatedItem(title) {
    await this.page.locator(`.related-items .category-card:has-text("${title}")`).click();
  }
}
