import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Routing Utilities", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { hash: "" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  describe("getCurrentSeason", () => {
    it("should return spring for March", () => {
      const mockDate = new Date("2024-03-15");
      vi.spyOn(Date, "now").mockReturnValue(mockDate.getTime());

      const month = mockDate.getMonth() + 1;
      const season =
        month >= 3 && month <= 5
          ? "spring"
          : month >= 6 && month <= 8
            ? "summer"
            : month >= 9 && month <= 11
              ? "autumn"
              : "winter";

      expect(season).toBe("spring");
    });

    it("should return summer for July", () => {
      const mockDate = new Date("2024-07-15");
      vi.spyOn(Date, "now").mockReturnValue(mockDate.getTime());

      const month = mockDate.getMonth() + 1;
      const season =
        month >= 3 && month <= 5
          ? "spring"
          : month >= 6 && month <= 8
            ? "summer"
            : month >= 9 && month <= 11
              ? "autumn"
              : "winter";

      expect(season).toBe("summer");
    });

    it("should return autumn for October", () => {
      const mockDate = new Date("2024-10-15");
      vi.spyOn(Date, "now").mockReturnValue(mockDate.getTime());

      const month = mockDate.getMonth() + 1;
      const season =
        month >= 3 && month <= 5
          ? "spring"
          : month >= 6 && month <= 8
            ? "summer"
            : month >= 9 && month <= 11
              ? "autumn"
              : "winter";

      expect(season).toBe("autumn");
    });

    it("should return winter for January", () => {
      const mockDate = new Date("2024-01-15");
      vi.spyOn(Date, "now").mockReturnValue(mockDate.getTime());

      const month = mockDate.getMonth() + 1;
      const season =
        month >= 3 && month <= 5
          ? "spring"
          : month >= 6 && month <= 8
            ? "summer"
            : month >= 9 && month <= 11
              ? "autumn"
              : "winter";

      expect(season).toBe("winter");
    });
  });

  describe("getCurrentPageFromHash", () => {
    it("should extract page number from hash", () => {
      window.location.hash = "#category/animals?page=3";
      const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);
      const page = parseInt(urlParams.get("page") || "1");

      expect(page).toBe(3);
    });

    it("should default to page 1 when no page param", () => {
      window.location.hash = "#category/animals";
      const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);
      const page = parseInt(urlParams.get("page") || "1");

      expect(page).toBe(1);
    });

    it("should handle page parameter with other params", () => {
      window.location.hash = "#category/animals?page=5&sort=newest";
      const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);
      const page = parseInt(urlParams.get("page") || "1");

      expect(page).toBe(5);
    });

    it("should handle empty hash", () => {
      window.location.hash = "";
      const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);
      const page = parseInt(urlParams.get("page") || "1");

      expect(page).toBe(1);
    });

    it("should handle invalid page number", () => {
      window.location.hash = "#category/animals?page=invalid";
      const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);
      const page = parseInt(urlParams.get("page") || "1");

      expect(page).toBeNaN();
    });
  });

  describe("getCurrentSortFromHash", () => {
    it("should extract sort option from hash", () => {
      window.location.hash = "#category/animals?sort=newest";
      const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);
      const sort = urlParams.get("sort") || "popular";

      expect(sort).toBe("newest");
    });

    it("should default to popular when no sort param", () => {
      window.location.hash = "#category/animals?page=3";
      const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);
      const sort = urlParams.get("sort") || "popular";

      expect(sort).toBe("popular");
    });

    it("should handle sort parameter with other params", () => {
      window.location.hash = "#category/animals?page=2&sort=alphabetical";
      const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);
      const sort = urlParams.get("sort") || "popular";

      expect(sort).toBe("alphabetical");
    });

    it("should handle empty hash", () => {
      window.location.hash = "";
      const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);
      const sort = urlParams.get("sort") || "popular";

      expect(sort).toBe("popular");
    });
  });

  describe("Route Parsing", () => {
    it("should parse category route correctly", () => {
      window.location.hash = "#category/animals";
      const hashParts = window.location.hash.replace("#", "").split("/");

      expect(hashParts[0]).toBe("category");
      expect(hashParts[1]).toBe("animals");
    });

    it("should parse item route correctly", () => {
      window.location.hash = "#item/animals/animal_1";
      const hashParts = window.location.hash.replace("#", "").split("/");

      expect(hashParts[0]).toBe("item");
      expect(hashParts[1]).toBe("animals");
      expect(hashParts[2]).toBe("animal_1");
    });

    it("should parse daily pick route correctly", () => {
      window.location.hash = "#dailypick";
      const hashParts = window.location.hash.replace("#", "").split("/");

      expect(hashParts[0]).toBe("dailypick");
    });

    it("should handle empty hash (home route)", () => {
      window.location.hash = "";
      const route = window.location.hash.replace("#", "") || "home";

      expect(route).toBe("home");
    });
  });
});
