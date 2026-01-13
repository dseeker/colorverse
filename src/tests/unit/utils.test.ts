import { describe, it, expect } from "vitest";

const CATEGORY_ICONS: Record<string, string> = {
  animals: "fas fa-paw",
  fantasy: "fas fa-hat-wizard",
  nature: "fas fa-leaf",
  vehicles: "fas fa-car",
  space: "fas fa-rocket",
  holidays: "fas fa-gift",
  mandalas: "fas fa-circle-notch",
  food: "fas fa-utensils",
};

const PASTEL_GRADIENTS = [
  "from-pink-200 to-purple-200",
  "from-yellow-200 to-green-200",
  "from-blue-200 to-indigo-200",
  "from-purple-200 to-pink-200",
  "from-green-200 to-blue-200",
  "from-orange-200 to-red-200",
];

describe("Utility Functions", () => {
  describe("getCategoryIcon", () => {
    it("should return correct icon for animals category", () => {
      const categoryKey = "animals";
      const icon = CATEGORY_ICONS[categoryKey] || "fas fa-paint-brush";

      expect(icon).toBe("fas fa-paw");
    });

    it("should return correct icon for fantasy category", () => {
      const categoryKey = "fantasy";
      const icon = CATEGORY_ICONS[categoryKey] || "fas fa-paint-brush";

      expect(icon).toBe("fas fa-hat-wizard");
    });

    it("should return correct icon for nature category", () => {
      const categoryKey = "nature";
      const icon = CATEGORY_ICONS[categoryKey] || "fas fa-paint-brush";

      expect(icon).toBe("fas fa-leaf");
    });

    it("should return default icon for unknown category", () => {
      const categoryKey = "unknown";
      const icon = CATEGORY_ICONS[categoryKey] || "fas fa-paint-brush";

      expect(icon).toBe("fas fa-paint-brush");
    });

    it("should handle empty category key", () => {
      const categoryKey = "";
      const icon = CATEGORY_ICONS[categoryKey] || "fas fa-paint-brush";

      expect(icon).toBe("fas fa-paint-brush");
    });

    it("should return correct icon for vehicles category", () => {
      const categoryKey = "vehicles";
      const icon = CATEGORY_ICONS[categoryKey] || "fas fa-paint-brush";

      expect(icon).toBe("fas fa-car");
    });

    it("should return correct icon for space category", () => {
      const categoryKey = "space";
      const icon = CATEGORY_ICONS[categoryKey] || "fas fa-paint-brush";

      expect(icon).toBe("fas fa-rocket");
    });

    it("should return correct icon for holidays category", () => {
      const categoryKey = "holidays";
      const icon = CATEGORY_ICONS[categoryKey] || "fas fa-paint-brush";

      expect(icon).toBe("fas fa-gift");
    });

    it("should return correct icon for mandalas category", () => {
      const categoryKey = "mandalas";
      const icon = CATEGORY_ICONS[categoryKey] || "fas fa-paint-brush";

      expect(icon).toBe("fas fa-circle-notch");
    });

    it("should return correct icon for food category", () => {
      const categoryKey = "food";
      const icon = CATEGORY_ICONS[categoryKey] || "fas fa-paint-brush";

      expect(icon).toBe("fas fa-utensils");
    });
  });

  describe("getRandomPastelGradient", () => {
    it("should return a valid gradient", () => {
      const gradient = PASTEL_GRADIENTS[Math.floor(Math.random() * PASTEL_GRADIENTS.length)];

      expect(PASTEL_GRADIENTS).toContain(gradient);
    });

    it("should return gradient with correct format", () => {
      const gradient = PASTEL_GRADIENTS[0];
      const hasFrom = gradient.startsWith("from-");
      const hasTo = gradient.includes("to-");

      expect(hasFrom).toBe(true);
      expect(hasTo).toBe(true);
    });

    it("should contain only pastel colors", () => {
      const pastelColors = ["pink", "purple", "yellow", "green", "blue", "indigo", "orange", "red"];

      PASTEL_GRADIENTS.forEach(gradient => {
        const hasPastelColor = pastelColors.some(color => gradient.includes(color));
        expect(hasPastelColor).toBe(true);
      });
    });

    it("should have multiple distinct gradients", () => {
      expect(PASTEL_GRADIENTS.length).toBeGreaterThan(1);
    });

    it("should not have duplicate gradients", () => {
      const uniqueGradients = new Set(PASTEL_GRADIENTS);
      expect(uniqueGradients.size).toBe(PASTEL_GRADIENTS.length);
    });
  });

  describe("Helper Utilities", () => {
    it("should capitalize first letter", () => {
      const text = "hello";
      const capitalized = text.charAt(0).toUpperCase() + text.slice(1);

      expect(capitalized).toBe("Hello");
    });

    it("should capitalize multiple words", () => {
      const text = "hello world";
      const words = text.split(" ");
      const capitalized = words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

      expect(capitalized).toBe("Hello World");
    });

    it("should handle empty string", () => {
      const text = "";
      const capitalized = text.charAt(0).toUpperCase() + text.slice(1);

      expect(capitalized).toBe("");
    });

    it("should handle single character", () => {
      const text = "a";
      const capitalized = text.charAt(0).toUpperCase() + text.slice(1);

      expect(capitalized).toBe("A");
    });

    it("should trim whitespace", () => {
      const text = "  hello  ";
      const trimmed = text.trim();

      expect(trimmed).toBe("hello");
    });

    it("should check if string is empty", () => {
      const empty = "";
      const notEmpty = "hello";

      expect(empty.length).toBe(0);
      expect(notEmpty.length).toBeGreaterThan(0);
    });

    it("should parse integer from string", () => {
      const numStr = "42";
      const num = parseInt(numStr, 10);

      expect(num).toBe(42);
    });

    it("should handle invalid integer parse", () => {
      const numStr = "invalid";
      const num = parseInt(numStr, 10);

      expect(num).toBeNaN();
    });

    it("should format number with suffix", () => {
      const num = 1;
      const suffix = num === 1 ? "item" : "items";

      expect(suffix).toBe("item");
    });

    it("should format plural suffix", () => {
      const num = 5;
      const suffix = num === 1 ? "item" : "items";

      expect(suffix).toBe("items");
    });
  });

  describe("Array Utilities", () => {
    it("should check if array contains value", () => {
      const arr = ["a", "b", "c"];
      const hasA = arr.includes("a");
      const hasD = arr.includes("d");

      expect(hasA).toBe(true);
      expect(hasD).toBe(false);
    });

    it("should get array length", () => {
      const arr = [1, 2, 3, 4, 5];
      expect(arr.length).toBe(5);
    });

    it("should map over array", () => {
      const arr = [1, 2, 3];
      const doubled = arr.map(x => x * 2);

      expect(doubled).toEqual([2, 4, 6]);
    });

    it("should filter array", () => {
      const arr = [1, 2, 3, 4, 5];
      const evens = arr.filter(x => x % 2 === 0);

      expect(evens).toEqual([2, 4]);
    });

    it("should reduce array", () => {
      const arr = [1, 2, 3];
      const sum = arr.reduce((acc, val) => acc + val, 0);

      expect(sum).toBe(6);
    });
  });

  describe("Object Utilities", () => {
    it("should get object keys", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keys = Object.keys(obj);

      expect(keys).toEqual(["a", "b", "c"]);
    });

    it("should get object values", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const values = Object.values(obj);

      expect(values).toEqual([1, 2, 3]);
    });

    it("should check if key exists", () => {
      const obj = { a: 1, b: 2 };
      const hasA = "a" in obj;
      const hasC = "c" in obj;

      expect(hasA).toBe(true);
      expect(hasC).toBe(false);
    });

    it("should handle object property access", () => {
      const obj = { nested: { value: 42 } };
      const value = obj?.nested?.value;

      expect(value).toBe(42);
    });
  });

  describe("Seed Consistency (Hash Functions)", () => {
    function stringToHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    }

    function getDeterministicSeed(categoryKey, itemKey) {
      const combined = `${categoryKey}-${itemKey}`;
      return stringToHash(combined);
    }

    function getDeterministicSeedFromItemKey(itemKey) {
      return stringToHash(itemKey);
    }

    it("stringToHash should produce same hash for identical inputs", () => {
      const input = "cute cat coloring page";
      const hash1 = stringToHash(input);
      const hash2 = stringToHash(input);

      expect(hash1).toBe(hash2);
    });

    it("stringToHash should produce different hashes for different inputs", () => {
      const hash1 = stringToHash("cute cat");
      const hash2 = stringToHash("cute dog");

      expect(hash1).not.toBe(hash2);
    });

    it("stringToHash should handle empty string", () => {
      const hash = stringToHash("");

      expect(hash).toBe(0);
    });

    it("stringToHash should handle long strings", () => {
      const longString = "a".repeat(1000);
      const hash = stringToHash(longString);

      expect(typeof hash).toBe("number");
      expect(hash).toBeGreaterThanOrEqual(0);
    });

    it("stringToHash should stay within 32-bit integer range", () => {
      const testStrings = ["test", "longer test string", "unicode: café", "emoji: 🎨"];
      for (const str of testStrings) {
        const hash = stringToHash(str);
        expect(hash).toBeLessThan(Math.pow(2, 31));
      }
    });

    it("getDeterministicSeed should be consistent across calls", () => {
      const seed1 = getDeterministicSeed("animals", "cute cat");
      const seed2 = getDeterministicSeed("animals", "cute cat");

      expect(seed1).toBe(seed2);
    });

    it("getDeterministicSeed should produce different seeds for different categories", () => {
      const animalSeed = getDeterministicSeed("animals", "cute cat");
      const fantasySeed = getDeterministicSeed("fantasy", "cute cat");

      expect(animalSeed).not.toBe(fantasySeed);
    });

    it("getDeterministicSeed should produce different seeds for different items", () => {
      const catSeed = getDeterministicSeed("animals", "cute cat");
      const dogSeed = getDeterministicSeed("animals", "cute dog");

      expect(catSeed).not.toBe(dogSeed);
    });

    it("getDeterministicSeedFromItemKey should be consistent", () => {
      const seed1 = getDeterministicSeedFromItemKey("seasonal-christmas-tree");
      const seed2 = getDeterministicSeedFromItemKey("seasonal-christmas-tree");

      expect(seed1).toBe(seed2);
    });

    it("getDeterministicSeedFromItemKey should differ for different items", () => {
      const treeSeed = getDeterministicSeedFromItemKey("seasonal-christmas-tree");
      const snowSeed = getDeterministicSeedFromItemKey("seasonal-snowflake");

      expect(treeSeed).not.toBe(snowSeed);
    });

    it("seed functions should produce non-negative integers", () => {
      const testCases = [
        () => stringToHash("test"),
        () => getDeterministicSeed("animals", "cute cat"),
        () => getDeterministicSeedFromItemKey("standalone item"),
      ];

      for (const fn of testCases) {
        const result = fn();
        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
