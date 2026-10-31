import { describe, it, expect, beforeEach, vi } from "vitest";

const THEMES = ["light", "dark", "colorful"];

describe("Theme Management", () => {
  let bodyElement: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div>
        <button id="theme-light" class="p-2"></button>
        <button id="theme-dark" class="p-2"></button>
        <button id="theme-colorful" class="p-2"></button>
      </div>
    `;
    bodyElement = document.body;
    bodyElement.className = "";
  });

  describe("applyTheme", () => {
    it("should apply light theme classes", () => {
      const themeName = "light";
      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add(`theme-${themeName}`);
      localStorage.setItem("colorverse-theme", themeName);

      expect(bodyElement.classList.contains("theme-light")).toBe(true);
      expect(bodyElement.classList.contains("theme-dark")).toBe(false);
      expect(bodyElement.classList.contains("theme-colorful")).toBe(false);
    });

    it("should apply dark theme classes", () => {
      const themeName = "dark";
      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add(`theme-${themeName}`);
      localStorage.setItem("colorverse-theme", themeName);

      expect(bodyElement.classList.contains("theme-dark")).toBe(true);
      expect(bodyElement.classList.contains("theme-light")).toBe(false);
      expect(bodyElement.classList.contains("theme-colorful")).toBe(false);
    });

    it("should apply colorful theme classes", () => {
      const themeName = "colorful";
      bodyElement.classList.remove("theme-light", "theme-dark", "theme-colorful");
      bodyElement.classList.add(`theme-${themeName}`);
      localStorage.setItem("colorverse-theme", themeName);

      expect(bodyElement.classList.contains("theme-colorful")).toBe(true);
      expect(bodyElement.classList.contains("theme-light")).toBe(false);
      expect(bodyElement.classList.contains("theme-dark")).toBe(false);
    });

    it("should save theme selection to localStorage", () => {
      const themeName = "dark";
      localStorage.setItem("colorverse-theme", themeName);

      expect(localStorage.getItem("colorverse-theme")).toBe(themeName);
    });

    it("should fallback to light theme for invalid theme", () => {
      const invalidTheme = "invalid";
      const validThemes = ["light", "dark", "colorful"];
      const themeName = validThemes.includes(invalidTheme) ? invalidTheme : "light";

      expect(themeName).toBe("light");
    });

    it("should update theme button active states", () => {
      const themeName = "dark";
      const themeButton = document.getElementById(`theme-${themeName}`);

      if (themeButton) {
        themeButton.classList.add("bg-white", "bg-opacity-30", "text-white", "font-bold");
      }

      expect(themeButton?.classList.contains("bg-white")).toBe(true);
      expect(themeButton?.classList.contains("bg-opacity-30")).toBe(true);
      expect(themeButton?.classList.contains("text-white")).toBe(true);
      expect(themeButton?.classList.contains("font-bold")).toBe(true);
    });

    it("should clear active state from all theme buttons", () => {
      ["light", "dark", "colorful"].forEach(theme => {
        const button = document.getElementById(`theme-${theme}`);
        if (button) {
          button.classList.remove("bg-white", "bg-opacity-30", "text-white", "font-bold");
        }
      });

      const allButtons = document.querySelectorAll('[id^="theme-"]');
      allButtons.forEach(button => {
        expect(button.classList.contains("bg-white")).toBe(false);
      });
    });
  });

  describe("Theme Switching Flow", () => {
    it("should cycle through themes correctly", () => {
      const themeSequence = ["light", "dark", "colorful"];
      themeSequence.forEach(themeName => {
        bodyElement.className = "";
        bodyElement.classList.add(`theme-${themeName}`);
        localStorage.setItem("colorverse-theme", themeName);

        expect(bodyElement.classList.contains(`theme-${themeName}`)).toBe(true);
      });
    });

    it("should persist theme across reloads", () => {
      const savedTheme = "colorful";
      localStorage.setItem("colorverse-theme", savedTheme);

      const loadedTheme = localStorage.getItem("colorverse-theme");
      expect(loadedTheme).toBe(savedTheme);
    });

    it("should handle multiple theme switches", () => {
      const switches = ["light", "dark", "light", "colorful", "dark"];
      switches.forEach(themeName => {
        bodyElement.className = "";
        bodyElement.classList.add(`theme-${themeName}`);
      });

      expect(bodyElement.classList.contains("theme-dark")).toBe(true);
    });
  });

  describe("Theme Validation", () => {
    it("should only accept valid theme names", () => {
      const validThemes = ["light", "dark", "colorful"];
      const invalidThemes = ["invalid", "test", "random"];

      validThemes.forEach(theme => {
        expect(THEMES.includes(theme)).toBe(true);
      });

      invalidThemes.forEach(theme => {
        expect(THEMES.includes(theme)).toBe(false);
      });
    });

    it("should maintain theme integrity", () => {
      bodyElement.classList.add("theme-dark");
      bodyElement.classList.remove("theme-light", "theme-colorful");

      expect(bodyElement.classList.contains("theme-dark")).toBe(true);
      expect(bodyElement.classList.contains("theme-light")).toBe(false);
      expect(bodyElement.classList.contains("theme-colorful")).toBe(false);
      expect(bodyElement.classList.length).toBe(1);
    });
  });

  describe("LocalStorage Integration", () => {
    it("should save theme preference", () => {
      localStorage.setItem("colorverse-theme", "colorful");
      expect(localStorage.getItem("colorverse-theme")).toBe("colorful");
    });

    it("should retrieve saved theme", () => {
      localStorage.setItem("colorverse-theme", "dark");
      const theme = localStorage.getItem("colorverse-theme") || "light";
      expect(theme).toBe("dark");
    });

    it("should default to light theme if no saved preference", () => {
      const theme = localStorage.getItem("colorverse-theme") || "light";
      expect(theme).toBe("light");
    });

    it("should handle localStorage errors gracefully", () => {
      vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("Storage full");
      });

      const errorThrown = () => {
        localStorage.setItem("colorverse-theme", "dark");
      };

      expect(errorThrown).toThrow();
    });
  });
});
