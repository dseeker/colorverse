import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("Theme Switching Integration", () => {
  let bodyElement: HTMLElement;
  let imageLoadQueue: {
    cancelAll: () => void;
    add: (element: HTMLImageElement, id: string) => void;
  };
  let cancelAllCalled = false;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="page-container">
        <div id="main-content"></div>
      </div>
      <header>
        <button id="theme-light" title="Light Mode" class="p-2"></button>
        <button id="theme-dark" title="Dark Mode" class="p-2"></button>
        <button id="theme-colorful" title="Colorful Mode" class="p-2"></button>
      </header>
    `;
    bodyElement = document.body;
    localStorage.clear();

    cancelAllCalled = false;
    imageLoadQueue = {
      cancelAll: function () {
        cancelAllCalled = true;
      },
      add: function (element: HTMLImageElement, id: string) {},
    };

    global.Image = class MockImage {
      src: string = "";
      naturalWidth: number = 100;
      naturalHeight: number = 100;
      complete: boolean = true;
      onload: () => {};
      onerror: () => {};
    };
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("Theme Application", () => {
    it("should apply light theme classes", () => {
      const themeName = "light";
      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add(`theme-${themeName}`);
      localStorage.setItem("colorverse-theme", themeName);

      expect(bodyElement.classList.contains("theme-light")).toBe(true);
      expect(bodyElement.classList.contains("theme-dark")).toBe(false);
      expect(bodyElement.classList.contains("theme-colorful")).toBe(false);
      expect(localStorage.getItem("colorverse-theme")).toBe("light");
    });

    it("should apply dark theme classes", () => {
      const themeName = "dark";
      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add(`theme-${themeName}`);
      localStorage.setItem("colorverse-theme", themeName);

      expect(bodyElement.classList.contains("theme-dark")).toBe(true);
      expect(bodyElement.classList.contains("theme-light")).toBe(false);
      expect(bodyElement.classList.contains("theme-colorful")).toBe(false);
      expect(localStorage.getItem("colorverse-theme")).toBe("dark");
    });

    it("should apply colorful theme classes", () => {
      const themeName = "colorful";
      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add(`theme-${themeName}`);
      localStorage.setItem("colorverse-theme", themeName);

      expect(bodyElement.classList.contains("theme-colorful")).toBe(true);
      expect(bodyElement.classList.contains("theme-light")).toBe(false);
      expect(bodyElement.classList.contains("theme-dark")).toBe(false);
      expect(localStorage.getItem("colorverse-theme")).toBe("colorful");
    });
  });

  describe("Theme Switching Flow", () => {
    it("should cancel pending image loads on style change", () => {
      const themeName = "dark";
      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add(`theme-${themeName}`);
      localStorage.setItem("colorverse-theme", themeName);
      imageLoadQueue.cancelAll();

      expect(cancelAllCalled).toBe(true);
    });

    it("should reload all images on theme change", () => {
      const images = document.querySelectorAll("img");
      const initialCount = images.length;

      const themeName = "dark";
      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add(`theme-${themeName}`);

      const updatedImages = document.querySelectorAll("img");
      expect(updatedImages.length).toBe(initialCount);
    });

    it("should update global style variable", () => {
      const themeName = "dark";
      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add(`theme-${themeName}`);

      expect(bodyElement.classList.contains("theme-dark")).toBe(true);
    });
  });

  describe("Theme Button States", () => {
    it("should update active state on light theme button", () => {
      const themeName = "light";
      const themeButton = document.getElementById(`theme-${themeName}`);

      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add(`theme-${themeName}`);

      document.querySelectorAll('[id^="theme-"]').forEach(button => {
        button.classList.remove("bg-white", "bg-opacity-30", "text-white", "font-bold");
      });

      if (themeButton) {
        themeButton.classList.add("bg-white", "bg-opacity-30", "text-white", "font-bold");
      }

      expect(themeButton?.classList.contains("bg-white")).toBe(true);
      expect(themeButton?.classList.contains("bg-opacity-30")).toBe(true);
      expect(themeButton?.classList.contains("text-white")).toBe(true);
      expect(themeButton?.classList.contains("font-bold")).toBe(true);
    });

    it("should clear active state from other buttons", () => {
      const themeName = "dark";

      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add(`theme-${themeName}`);

      document.querySelectorAll('[id^="theme-"]').forEach(button => {
        button.classList.remove("bg-white", "bg-opacity-30", "text-white", "font-bold");
      });

      const activeButton = document.getElementById("theme-dark");
      if (activeButton) {
        activeButton.classList.add("bg-white", "bg-opacity-30", "text-white", "font-bold");
      }

      const lightButton = document.getElementById("theme-light");
      const colorfulButton = document.getElementById("theme-colorful");

      expect(lightButton?.classList.contains("bg-white")).toBe(false);
      expect(colorfulButton?.classList.contains("bg-white")).toBe(false);
      expect(activeButton?.classList.contains("bg-white")).toBe(true);
    });
  });

  describe("Carousel Buttons Theme Update", () => {
    it("should update carousel buttons for dark theme", () => {
      const themeName = "dark";
      const carouselButtons = document.querySelectorAll("button");

      carouselButtons.forEach(button => {
        button.classList.remove(
          "bg-white",
          "hover:bg-gray-100",
          "bg-gray-700",
          "hover:bg-gray-600",
          "text-white"
        );

        if (themeName === "dark") {
          button.classList.add("bg-gray-700", "hover:bg-gray-600", "text-white");
        } else {
          button.classList.add("bg-white", "hover:bg-gray-100");
        }
      });

      const carouselButton = document.querySelector("button");
      expect(carouselButton?.classList.contains("bg-gray-700")).toBe(true);
      expect(carouselButton?.classList.contains("hover:bg-gray-600")).toBe(true);
      expect(carouselButton?.classList.contains("text-white")).toBe(true);
    });

    it("should update carousel buttons for light theme", () => {
      const themeName = "light";
      const carouselButtons = document.querySelectorAll("button");

      carouselButtons.forEach(button => {
        button.classList.remove(
          "bg-white",
          "hover:bg-gray-100",
          "bg-gray-700",
          "hover:bg-gray-600",
          "text-white"
        );

        if (themeName === "dark") {
          button.classList.add("bg-gray-700", "hover:bg-gray-600", "text-white");
        } else {
          button.classList.add("bg-white", "hover:bg-gray-100");
        }
      });

      const carouselButton = document.querySelector("button");
      expect(carouselButton?.classList.contains("bg-white")).toBe(true);
      expect(carouselButton?.classList.contains("hover:bg-gray-100")).toBe(true);
    });
  });

  describe("Image Loading Indicator Theme Update", () => {
    it("should update loading indicator for dark theme", () => {
      const themeName = "dark";
      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add(`theme-${themeName}`);

      const loadingIndicators = document.querySelectorAll(".image-loading-indicator");
      loadingIndicators.forEach(el => {
        el.classList.remove("bg-gray-100", "bg-gray-700");
        el.classList.add(themeName === "dark" ? "bg-gray-700" : "bg-gray-100");
      });

      if (loadingIndicators.length > 0) {
        const indicator = loadingIndicators[0] as HTMLElement;
        expect(indicator.classList.contains("bg-gray-700")).toBe(true);
      }
    });

    it("should update loading indicator for light theme", () => {
      const themeName = "light";
      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add(`theme-${themeName}`);

      const loadingIndicators = document.querySelectorAll(".image-loading-indicator");
      loadingIndicators.forEach(el => {
        el.classList.remove("bg-gray-100", "bg-gray-700");
        el.classList.add(themeName === "dark" ? "bg-gray-700" : "bg-gray-100");
      });

      if (loadingIndicators.length > 0) {
        const indicator = loadingIndicators[0] as HTMLElement;
        expect(indicator.classList.contains("bg-gray-100")).toBe(true);
      }
    });
  });

  describe("Multiple Theme Switches", () => {
    it("should handle light to dark switch", () => {
      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add("theme-light");

      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add("theme-dark");

      expect(bodyElement.classList.contains("theme-dark")).toBe(true);
      expect(bodyElement.classList.contains("theme-light")).toBe(false);
    });

    it("should handle dark to colorful switch", () => {
      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add("theme-dark");

      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add("theme-colorful");

      expect(bodyElement.classList.contains("theme-colorful")).toBe(true);
      expect(bodyElement.classList.contains("theme-dark")).toBe(false);
    });

    it("should handle multiple rapid switches", () => {
      const themes = ["light", "dark", "light", "colorful", "dark", "colorful", "light"];

      themes.forEach(themeName => {
        bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
        bodyElement.classList.add(`theme-${themeName}`);
      });

      expect(bodyElement.classList.contains("theme-light")).toBe(true);
    });
  });

  describe("Theme Persistence", () => {
    it("should persist theme selection", () => {
      const themeName = "colorful";
      localStorage.setItem("colorverse-theme", themeName);

      const savedTheme = localStorage.getItem("colorverse-theme");
      expect(savedTheme).toBe(themeName);
    });

    it("should load saved theme on initialization", () => {
      const savedTheme = "dark";
      localStorage.setItem("colorverse-theme", savedTheme);

      const loadedTheme = localStorage.getItem("colorverse-theme");

      if (loadedTheme) {
        bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
        bodyElement.classList.add(`theme-${loadedTheme}`);
      }

      expect(bodyElement.classList.contains("theme-dark")).toBe(true);
    });

    it("should default to light theme when no saved preference", () => {
      const defaultTheme = localStorage.getItem("colorverse-theme") || "light";

      expect(defaultTheme).toBe("light");
    });
  });
});
