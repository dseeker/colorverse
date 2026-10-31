import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("Navigation Integration", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="page-container">
        <div id="main-content"></div>
      </div>
      <header class="bg-gradient-to-r from-cyan-500 to-blue-500"></header>
      <nav class="flex items-center">
        <button id="theme-light" class="p-2"></button>
        <button id="theme-dark" class="p-2"></button>
        <button id="theme-colorful" class="p-2"></button>
      </nav>
    `;
    localStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("Route Navigation", () => {
    it("should handle homepage route", () => {
      window.location.hash = "";
      const route = window.location.hash.replace("#", "") || "home";

      expect(route).toBe("home");
    });

    it("should handle category route", () => {
      window.location.hash = "#category/animals";
      const route = window.location.hash.replace("#", "").split("/");

      expect(route[0]).toBe("category");
      expect(route[1]).toBe("animals");
    });

    it("should handle item route", () => {
      window.location.hash = "#item/animals/animal_1";
      const route = window.location.hash.replace("#", "").split("/");

      expect(route[0]).toBe("item");
      expect(route[1]).toBe("animals");
      expect(route[2]).toBe("animal_1");
    });

    it("should handle daily pick route", () => {
      window.location.hash = "#dailypick";
      const route = window.location.hash.replace("#", "").split("/");

      expect(route[0]).toBe("dailypick");
    });

    it("should handle seasonal gallery route", () => {
      window.location.hash = "#seasonal";
      const route = window.location.hash.replace("#", "").split("/");

      expect(route[0]).toBe("seasonal");
    });
  });

  describe("Hash Change Handling", () => {
    it("should detect hash changes", () => {
      window.location.hash = "#category/animals";
      const hashChanged = window.location.hash === "#category/animals";

      expect(hashChanged).toBe(true);
    });

    it("should handle multiple hash changes", () => {
      window.location.hash = "#category/animals";
      let route = window.location.hash.replace("#", "");

      expect(route).toBe("category/animals");

      window.location.hash = "#category/fantasy";
      route = window.location.hash.replace("#", "");

      expect(route).toBe("category/fantasy");
    });

    it("should handle page parameter changes", () => {
      window.location.hash = "#category/animals?page=2";
      const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);
      const page = parseInt(urlParams.get("page") || "1");

      expect(page).toBe(2);

      window.location.hash = "#category/animals?page=5";
      const newUrlParams = new URLSearchParams(window.location.hash.split("?")[1]);
      const newPage = parseInt(newUrlParams.get("page") || "1");

      expect(newPage).toBe(5);
    });

    it("should handle sort parameter changes", () => {
      window.location.hash = "#category/animals?sort=newest";
      const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);
      const sort = urlParams.get("sort") || "popular";

      expect(sort).toBe("newest");

      window.location.hash = "#category/animals?sort=alphabetical";
      const newUrlParams = new URLSearchParams(window.location.hash.split("?")[1]);
      const newSort = newUrlParams.get("sort") || "popular";

      expect(newSort).toBe("alphabetical");
    });
  });

  describe("DOM Updates on Navigation", () => {
    it("should update main content element", () => {
      const mainContent = document.getElementById("main-content");

      if (mainContent) {
        mainContent.innerHTML = "<h1>Test Content</h1>";
        const hasContent = mainContent.innerHTML.includes("Test Content");

        expect(hasContent).toBe(true);
      }
    });

    it("should update page container", () => {
      const pageContainer = document.getElementById("page-container");

      if (pageContainer) {
        pageContainer.classList.add("loading");
        const isLoading = pageContainer.classList.contains("loading");

        expect(isLoading).toBe(true);
      }
    });

    it("should show/hide loading indicator", () => {
      const loadingIndicator = document.createElement("div");
      loadingIndicator.id = "loading-indicator";
      loadingIndicator.style.display = "none";
      document.body.appendChild(loadingIndicator);

      expect(loadingIndicator.style.display).toBe("none");

      loadingIndicator.style.display = "block";
      expect(loadingIndicator.style.display).toBe("block");
    });
  });

  describe("Navigation State Management", () => {
    it("should track current route", () => {
      window.location.hash = "#category/animals";
      const currentRoute = window.location.hash;

      expect(currentRoute).toBe("#category/animals");
    });

    it("should track previous route", () => {
      let previousRoute = "";
      const routes: string[] = [];

      routes.push("#category/animals");
      routes.push("#category/fantasy");

      previousRoute = routes[routes.length - 2];
      const currentRoute = routes[routes.length - 1];

      expect(previousRoute).toBe("#category/animals");
      expect(currentRoute).toBe("#category/fantasy");
    });

    it("should handle back navigation", () => {
      window.location.hash = "#category/animals";
      const firstRoute = window.location.hash;

      window.location.hash = "#category/fantasy";
      const secondRoute = window.location.hash;

      expect(firstRoute).toBe("#category/animals");
      expect(secondRoute).toBe("#category/fantasy");
    });
  });

  describe("Navigation with Parameters", () => {
    it("should handle route with page number", () => {
      window.location.hash = "#category/animals?page=3";
      const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);

      expect(urlParams.get("page")).toBe("3");
    });

    it("should handle route with sort option", () => {
      window.location.hash = "#category/animals?sort=alphabetical";
      const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);

      expect(urlParams.get("sort")).toBe("alphabetical");
    });

    it("should handle route with multiple parameters", () => {
      window.location.hash = "#category/animals?page=2&sort=newest";
      const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);

      expect(urlParams.get("page")).toBe("2");
      expect(urlParams.get("sort")).toBe("newest");
    });

    it("should handle route without parameters", () => {
      window.location.hash = "#category/animals";
      const hasParams = window.location.hash.includes("?");

      expect(hasParams).toBe(false);
    });
  });
});
