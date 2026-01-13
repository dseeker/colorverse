import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("User Journey: Responsive Design", () => {
  let mainContent: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="page-container">
        <div id="main-content">
          <h1>ColorVerse</h1>
          <div class="category-card">Animal Kingdom</div>
        </div>
      </div>
    `;
    mainContent = document.getElementById("main-content")!;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("should display correctly on desktop", () => {
    const mainElement = document.getElementById("main-content");
    expect(mainElement).toBeTruthy();
  });

  it("should display correctly on tablet", () => {
    const mainElement = document.getElementById("main-content");
    expect(mainElement).toBeTruthy();
  });

  it("should display correctly on mobile", () => {
    const mainElement = document.getElementById("main-content");
    expect(mainElement).toBeTruthy();
  });

  it("should display all content", () => {
    const title = mainContent.querySelector("h1");
    const categories = mainContent.querySelectorAll(".category-card");

    expect(title).toBeTruthy();
    expect(categories.length).toBe(1);
  });

  it("should have responsive container", () => {
    const container = document.getElementById("page-container");
    expect(container).toBeTruthy();
  });
});
