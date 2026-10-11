import { describe, it, expect } from "vitest";
import { COLORING_STYLES, buildColoringPrompt, buildCatalogKey } from "../../../shared/prompts.js";

const CLASSIC_TEMPLATE =
  "high contrast black and white line art coloring page, {item}, pure outlines with no shading, no color, no grayscale, thick clean lines, simple contours only";

describe("Shared Prompt Module (src/shared/prompts.js)", () => {
  describe("COLORING_STYLES", () => {
    it("should contain the expected 17 entries (16 named styles + classic)", () => {
      expect(Object.keys(COLORING_STYLES)).toHaveLength(17);
      // 16 named styles plus the classic (empty-key) entry
      const namedStyles = Object.keys(COLORING_STYLES).filter(k => k !== "");
      expect(namedStyles).toHaveLength(16);
    });

    it("should include the classic style under the empty string key", () => {
      expect(COLORING_STYLES[""]).toBeDefined();
      expect(COLORING_STYLES[""].name).toBe("Classic Style");
      expect(COLORING_STYLES[""].prompt).toBe("");
    });

    it("should include the painted_preview style", () => {
      expect(COLORING_STYLES["painted_preview"]).toBeDefined();
      expect(COLORING_STYLES["painted_preview"].name).toBe("Painted Preview");
    });

    it("should have non-empty prompts for every non-classic style", () => {
      for (const [key, style] of Object.entries(COLORING_STYLES)) {
        if (key === "") {
          continue;
        }
        expect(typeof style.prompt).toBe("string");
        expect(style.prompt.length).toBeGreaterThan(0);
        expect(typeof style.name).toBe("string");
        expect(style.name.length).toBeGreaterThan(0);
      }
    });
  });

  describe("buildColoringPrompt — classic style", () => {
    it("should return the base template with the item description for the classic (empty) style", () => {
      const prompt = buildColoringPrompt("a cute cat sitting on a fence", "");
      expect(prompt).toBe(CLASSIC_TEMPLATE.replace("{item}", "a cute cat sitting on a fence"));
    });

    it("should embed the description verbatim in the template", () => {
      const item = "an intricate mandala flower";
      const prompt = buildColoringPrompt(item, "");
      expect(prompt).toContain(item);
      expect(prompt).toMatch(/^high contrast black and white line art coloring page, /);
      expect(prompt).toMatch(
        /, pure outlines with no shading, no color, no grayscale, thick clean lines, simple contours only$/
      );
    });
  });

  describe("buildColoringPrompt — styled", () => {
    it("should apply the style prompt suffix for a non-empty style key", () => {
      const style = COLORING_STYLES["bold-simple"];
      const item = "a roaring lion";
      const prompt = buildColoringPrompt(item, "bold-simple");

      // Style is prepended for maximum priority...
      expect(prompt.slice(0, `${style.prompt}, coloring page of ${item}, `.length)).toBe(
        `${style.prompt}, coloring page of ${item}, `
      );
      // ...and echoed at the end to emphasize it to the model.
      expect(prompt.slice(-`EMPHASIZE THE STYLE: ${style.prompt}`.length)).toBe(
        `EMPHASIZE THE STYLE: ${style.prompt}`
      );
      expect(prompt).toContain(
        "black and white line art, no color, no shading, no grayscale, pure outlines only"
      );
    });

    it("should use the hand-colored pencil template for the painted_preview style", () => {
      const style = COLORING_STYLES["painted_preview"];
      const item = "a sunset over the ocean";
      const prompt = buildColoringPrompt(item, "painted_preview");

      expect(prompt).toBe(
        `${style.prompt}, coloring page of ${item}, hand-colored with colored pencils, visible pencil strokes, limited pencil palette, slightly imperfect, not digitally rendered`
      );
    });

    it("should fall back to the classic template for an unknown style key", () => {
      const item = "a hot air balloon";
      expect(buildColoringPrompt(item, "not-a-real-style")).toBe(buildColoringPrompt(item, ""));
    });
  });

  describe("buildColoringPrompt — season modifiers", () => {
    it("should append seasonal keywords when a season is provided", () => {
      const prompt = buildColoringPrompt("a bare oak tree", "", "winter");
      expect(prompt).toContain("winter scene, snow, holidays, cozy, festive");
    });

    it("should append the season's keywords even when a style is active", () => {
      const prompt = buildColoringPrompt("a pumpkin patch", "whimsical", "autumn");
      expect(prompt).toContain("autumn leaves, harvest, cozy, fall colors, thanksgiving");
    });

    it("should NOT duplicate seasonal keywords already present in the description", () => {
      const item = "a winter scene with snow";
      const prompt = buildColoringPrompt(item, "", "winter");
      const occurrences = prompt.split("winter scene").length - 1;
      expect(occurrences).toBe(1);
    });

    it("should produce identical output with and without a no-op season", () => {
      // No season provided at all
      const noSeason = buildColoringPrompt("a cute puppy", "");
      // Season is only applied when truthy — undefined behaves like "none"
      const undefinedSeason = buildColoringPrompt("a cute puppy", "", undefined);
      expect(noSeason).toBe(undefinedSeason);
    });
  });

  describe("buildColoringPrompt — determinism", () => {
    it("should be deterministic: same inputs produce identical output", () => {
      const item = "a dragon perched on a castle";
      const styleKey = "fantasy";
      const season = "autumn";

      const prompt1 = buildColoringPrompt(item, styleKey, season);
      const prompt2 = buildColoringPrompt(item, styleKey, season);
      const prompt3 = buildColoringPrompt(item, styleKey, season);

      expect(prompt1).toBe(prompt2);
      expect(prompt2).toBe(prompt3);
    });

    it("should differ when the item description changes", () => {
      const cat = buildColoringPrompt("a cute cat", "");
      const dog = buildColoringPrompt("a cute dog", "");
      expect(cat).not.toBe(dog);
    });

    it("should differ when the style changes", () => {
      const classic = buildColoringPrompt("a bicycle", "");
      const bold = buildColoringPrompt("a bicycle", "bold-simple");
      expect(classic).not.toBe(bold);
    });
  });

  describe("buildCatalogKey", () => {
    it("should be deterministic: same style + seed produce the same key", () => {
      const key1 = buildCatalogKey("bold-simple", "12345");
      const key2 = buildCatalogKey("bold-simple", "12345");
      const key3 = buildCatalogKey("bold-simple", "12345");

      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
    });

    it("should return a stable non-empty hex string", () => {
      const key = buildCatalogKey("intricate", "99999");
      expect(typeof key).toBe("string");
      expect(key).toMatch(/^[0-9a-f]+$/);
      expect(key.length).toBeGreaterThan(0);
    });

    it("should produce different keys for different seeds", () => {
      const keyA = buildCatalogKey("geometric", "11111");
      const keyB = buildCatalogKey("geometric", "22222");
      expect(keyA).not.toBe(keyB);
    });

    it("should produce different keys for different styles", () => {
      const keyClassic = buildCatalogKey("", "424242");
      const keyDoodle = buildCatalogKey("doodle", "424242");
      expect(keyClassic).not.toBe(keyDoodle);
    });

    it("should produce different keys when both style and seed differ", () => {
      const keyA = buildCatalogKey("kawaii", "77777");
      const keyB = buildCatalogKey("zentangle", "88888");
      expect(keyA).not.toBe(keyB);
    });

    it("should handle the classic (empty) style key", () => {
      const key = buildCatalogKey("", "1");
      expect(key).toMatch(/^[0-9a-f]+$/);
      // Repeated calls stay stable across process runs — no Date.now/random involved
      expect(key).toBe(buildCatalogKey("", "1"));
    });

    it("should be stable for number-like seed values", () => {
      const itemKey = "animals_item_3";
      // 373592943 is stringToHash("animals_item_3") — computed deterministically
      const keyFromNumber = buildCatalogKey("vintage", "373592943");
      const keyFromSameNumber = buildCatalogKey("vintage", "373592943");
      expect(keyFromNumber).toBe(keyFromSameNumber);
    });
  });

  describe("client/worker parity (golden prompts)", () => {
    // Golden values: the exact strings the client (app.js getImageUrl)
    // produces today. If the worker ever builds a different prompt for the
    // same item + style + seed, cache keys diverge and these break.

    it("classic prompt matches the app.js golden string", () => {
      const golden =
        "high contrast black and white line art coloring page, a cute cat sitting on a fence, pure outlines with no shading, no color, no grayscale, thick clean lines, simple contours only";
      expect(buildColoringPrompt("a cute cat sitting on a fence", "")).toBe(golden);
    });

    it("bold-simple prompt matches the app.js golden string", () => {
      const style = COLORING_STYLES["bold-simple"];
      const item = "a cute cat sitting on a fence";
      const golden = `${style.prompt}, coloring page of ${item}, black and white line art, no color, no shading, no grayscale, pure outlines only, EMPHASIZE THE STYLE: ${style.prompt}`;
      expect(buildColoringPrompt(item, "bold-simple")).toBe(golden);
    });

    it("seasonal + styled prompt matches the app.js golden string", () => {
      const style = COLORING_STYLES["whimsical"];
      const item = "a pumpkin patch";
      const seasonal = "autumn leaves, harvest, cozy, fall colors, thanksgiving";
      const golden = `${style.prompt}, coloring page of ${item}, ${seasonal}, black and white line art, no color, no shading, no grayscale, pure outlines only, EMPHASIZE THE STYLE: ${style.prompt}`;
      expect(buildColoringPrompt(item, "whimsical", "autumn")).toBe(golden);
    });
  });
});
