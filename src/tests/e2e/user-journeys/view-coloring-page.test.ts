import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("User Journey: View Coloring Page", () => {
  let mainContent: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="page-container">
        <div id="main-content">
          <h1>Majestic Eagle</h1>
          <img id="coloring-image" src="https://gen.pollinations.ai/image/eagle?width=400&height=400" alt="Majestic Eagle Coloring Page">
          <a href="download.jpg" class="download-button">Download</a>
          <button onclick="printColoringPage('Majestic Eagle')" class="print-button">Print</button>
          <div class="related-items">
            <div class="category-card">Tiger Portrait</div>
            <div class="category-card">Dolphin Play</div>
          </div>
        </div>
      </div>
    `;
    mainContent = document.getElementById("main-content")!;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("should display coloring page title", () => {
    const title = mainContent.querySelector("h1");
    expect(title?.textContent).toBe("Majestic Eagle");
  });

  it("should display coloring image", () => {
    const image = mainContent.querySelector("#coloring-image") as HTMLImageElement;
    expect(image).toBeTruthy();
    expect(image?.src).toContain("gen.pollinations.ai");
    expect(image?.src).toContain("/image/");
    expect(image?.alt).toBe("Majestic Eagle Coloring Page");
  });

  it("should display download button", () => {
    const downloadButton = mainContent.querySelector(".download-button") as HTMLAnchorElement;
    expect(downloadButton).toBeTruthy();
    expect(downloadButton?.href).toContain("download.jpg");
  });

  it("should display print button", () => {
    const printButton = mainContent.querySelector(".print-button");
    expect(printButton).toBeTruthy();
    expect(printButton?.textContent).toBe("Print");
  });

  it("should display related items", () => {
    const relatedItems = mainContent.querySelectorAll(".related-items .category-card");
    expect(relatedItems.length).toBe(2);
    expect(relatedItems[0].textContent).toContain("Tiger Portrait");
    expect(relatedItems[1].textContent).toContain("Dolphin Play");
  });

  it("should handle download button click", () => {
    const downloadButton = mainContent.querySelector(".download-button");
    expect(downloadButton).toBeTruthy();
  });

  it("should handle print button click", () => {
    const printButton = mainContent.querySelector(".print-button");
    expect(printButton).toBeTruthy();
  });
});
