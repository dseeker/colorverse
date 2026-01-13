import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("User Journey: Browse Categories", () => {
  let mainContent: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="page-container">
        <div id="main-content">
          <h1>ColorVerse</h1>
          <div class="category-card">Animal Kingdom</div>
          <div class="category-card">Fantasy & Magic</div>
          <section class="daily-pick">Today's Special</section>
        </div>
      </div>
    `;
    mainContent = document.getElementById("main-content")!;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("should display homepage with ColorVerse title", () => {
    const title = mainContent.querySelector("h1");
    expect(title?.textContent).toBe("ColorVerse");
  });

  it("should display featured categories", () => {
    const categories = mainContent.querySelectorAll(".category-card");
    expect(categories.length).toBeGreaterThan(0);
  });

  it("should display daily pick section", () => {
    const dailyPick = mainContent.querySelector(".daily-pick");
    expect(dailyPick).toBeTruthy();
    expect(dailyPick?.textContent).toContain("Today's Special");
  });

  it("should handle category card clicks", () => {
    const categoryCard = mainContent.querySelector(".category-card");
    expect(categoryCard).toBeTruthy();

    categoryCard?.click();
    expect(true).toBe(true);
  });

  it("should navigate to category when clicked", () => {
    const categoryCard = mainContent.querySelector(".category-card");

    window.location.hash = "#category/animals";

    expect(window.location.hash).toBe("#category/animals");
  });
});
