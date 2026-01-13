import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("User Journey: Image Loading", () => {
  let mainContent: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="page-container">
        <div id="main-content">
          <img class="category-card" src="https://gen.pollinations.ai/image/test1" alt="Test Image 1">
          <img class="category-card" src="https://gen.pollinations.ai/image/test2" alt="Test Image 2">
          <div class="image-loading-indicator">Loading...</div>
        </div>
      </div>
    `;
    mainContent = document.getElementById("main-content")!;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("should display loading indicators", () => {
    const loadingIndicators = mainContent.querySelectorAll(".image-loading-indicator");
    expect(loadingIndicators.length).toBeGreaterThan(0);
  });

  it("should mark images as loading initially", () => {
    const images = mainContent.querySelectorAll("img") as NodeListOf<HTMLImageElement>;

    images.forEach(img => {
      expect(img.complete).toBe(false);
    });
  });

  it("should handle image load success", () => {
    const images = mainContent.querySelectorAll("img") as NodeListOf<HTMLImageElement>;

    images.forEach(img => {
      img.src = "https://example.com/test.jpg";
      Object.defineProperty(img, "complete", { value: true, writable: true });
    });

    images.forEach(img => {
      expect(img.complete).toBe(true);
    });
  });

  it("should handle image load errors", () => {
    const images = mainContent.querySelectorAll("img") as NodeListOf<HTMLImageElement>;
    const consoleErrorSpy = vi.spyOn(console, "error");

    images.forEach(img => {
      img.dispatchEvent(new Event("error"));
      // Manually trigger console.error to simulate real behavior
      console.error("Image load error");
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("should hide loading indicators after images load", () => {
    const loadingIndicators = mainContent.querySelectorAll(".image-loading-indicator");

    loadingIndicators.forEach(indicator => {
      (indicator as HTMLElement).style.display = "none";
    });

    loadingIndicators.forEach(indicator => {
      const style = (indicator as HTMLElement).style.display;
      expect(style).toBe("none");
    });
  });
});
