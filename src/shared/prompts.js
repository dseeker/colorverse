/**
 * Shared prompt-building module for ColorVerse.
 *
 * BOTH the client (app.js getImageUrl) and the content-api worker (catalog
 * generation) must build coloring prompts identically, or cache keys diverge
 * and the image proxy serves a different image than the one the client
 * requested. This module is the single source of truth.
 *
 * ESM, no DOM dependencies — safe to import from both the browser and the
 * Cloudflare Workers runtime.
 */

import { stringToHash } from "../../workers/shared/utils.js";

/**
 * @typedef {Object} ColoringStyle
 * @property {string} name - Display name
 * @property {string} prompt - Style prompt suffix ("" for classic)
 * @property {string} description - Human-facing style description
 */

/**
 * Coloring styles. Ported verbatim from app.js COLORING_STYLES.
 * The "" key is the classic (unstyled) approach.
 * @type {Record<string, ColoringStyle>}
 */
export const COLORING_STYLES = {
  "": {
    name: "Classic Style",
    prompt: "",
    description: "Traditional simple coloring book style",
  },
  "bold-simple": {
    name: "Bold & Simple",
    prompt:
      "bold thick outlines, heavy line weight, simple clean shapes, easy to color, thick borders, bold line art style, high contrast black lines, no thin lines",
    description: "Thick, clean outlines perfect for beginners",
  },
  intricate: {
    name: "Intricate & Detailed",
    prompt:
      "highly detailed line art, fine hairline strokes, ornate intricate patterns, dense complex details, fine line patterns, decorative elements, precise detailed outlines",
    description: "Complex detailed patterns for advanced colorists",
  },
  geometric: {
    name: "Geometric",
    prompt:
      "geometric precision, angular shapes, symmetrical forms, tessellated patterns, crystalline structures, strict geometric design, clean geometric outlines, no curves",
    description: "Perfectly symmetrical geometric shapes and mathematical patterns",
  },
  doodle: {
    name: "Doodle & Sketch",
    prompt:
      "hand-drawn sketchy line art, loose pencil strokes, spontaneous scribbled lines, loose informal drawing style, imperfect hand-drawn lines, rough sketchy outlines, black and white sketch",
    description: "Spontaneous, hand-drawn artistic expression with pencil sketch lines",
  },
  whimsical: {
    name: "Whimsical & Playful",
    prompt:
      "whimsical storybook illustration style, playful ornamental flourishes, charming illustrative design, lighthearted decorative elements, storybook illustration style, playful line art",
    description: "Charming, imaginative designs with fantasy elements",
  },
  vintage: {
    name: "Vintage & Retro",
    prompt:
      "vintage art nouveau style, retro classic illustration, ornate decorative borders, antique design aesthetic, old-fashioned ornate details, vintage line art style",
    description: "Nostalgic designs inspired by past eras",
  },
  fantasy: {
    name: "Fantasy & Surreal",
    prompt:
      "fantasy epic illustration style, mythical ornamental elements, otherworldly dreamlike design, enchanted decorative motifs, mystical ethereal line art, fantasy artwork style, black and white fantasy",
    description: "Imaginative scenes with mythical and magical elements",
  },
  children_friendly: {
    name: "Children Friendly",
    prompt:
      "extra thick outlines, bold heavy lines, simple clean shapes, chunky cartoon style, thick borders, easy to color, large unbroken areas, bold cartoon line art",
    description: "Extra simple drawings with thick lines, perfect for young children",
  },
  futuristic: {
    name: "Futuristic & Sci-Fi",
    prompt:
      "futuristic sci-fi design, sleek technological outlines, cyberpunk angular features, space-age design, high-tech geometric patterns, digital circuit aesthetics, futuristic line art",
    description: "Cutting-edge futuristic designs with sci-fi and tech elements",
  },
  minimalist: {
    name: "Minimalist & One-Line",
    prompt:
      "minimalist line art, clean essential strokes, elegant simplicity, minimal form, clean unbroken lines, simple minimal aesthetic, reduced line art",
    description: "Modern elegant style with minimal lines",
  },
  architectural: {
    name: "Technical",
    prompt:
      "technical blueprint line art, precise engineering lines, mechanical diagram style, architectural drawing style, technical schematic look, engineered precision, structured technical line art",
    description: "Precise, structured technical drawings and mechanical diagrams",
  },
  organic: {
    name: "Organic & Nature",
    prompt:
      "organic natural flowing line art, botanical line patterns, leaf vein line designs, flowing nature-inspired curves, organic botanical line art, flowing organic outlines",
    description: "Natural forms and textures inspired by nature",
  },
  zentangle: {
    name: "Zentangle Style",
    prompt:
      "zentangle meditation art, repetitive intricate patterns, detailed tangle designs, structured tangle motifs, complex repeating patterns, zen-inspired line patterns, zentangle line art",
    description: "Detailed repetitive patterns for meditative coloring",
  },
  kawaii: {
    name: "Kawaii & Cute",
    prompt:
      "kawaii cute illustration style, chibi cartoon design, round bubbly shapes, cute character line art, super cute Japanese aesthetic, endearing kawaii outlines, kawaii line art",
    description: "Adorable Japanese-inspired cute character style",
  },
  mosaic: {
    name: "Mosaic Style",
    prompt:
      "mosaic tile line art, tessellated geometric segments, tiled mosaic art style, segmented geometric patterns, mosaic tile outlines, black and white mosaic design",
    description: "Artistic mosaic patterns with tile-like segments",
  },
  painted_preview: {
    name: "Painted Preview",
    prompt:
      "PROFESSIONAL WATERCOLOR painting style, artistic coloring book illustration FULLY COLORED with gentle shading and shadows, soft painterly textures, harmonious color palette, skilled colorist technique, traditional art medium appearance, watercolor paper texture, artistic brush strokes, NOT line art but PAINTED ARTWORK",
    description: "See how it would look when professionally colored with watercolors",
  },
};

/**
 * Seasonal keyword sets. Ported from app.js SEASONAL_THEMES prompt fields.
 * @type {Record<string, string>}
 */
const SEASONAL_KEYWORDS = {
  spring: "spring blooms, fresh, floral, renewal, nature awakening",
  summer: "summer fun, beach, sunshine, vacation, tropical",
  autumn: "autumn leaves, harvest, cozy, fall colors, thanksgiving",
  winter: "winter scene, snow, holidays, cozy, festive",
};

/**
 * Build the coloring prompt for an item, applying style + season modifiers.
 *
 * Replicates the exact prompt assembly from app.js (getImageUrl):
 * - classic ("" style): base line-art template with the item description
 * - styled (non-empty styleKey): style-first template with the style prompt
 *   prepended AND echoed at the end for maximum model emphasis
 * - painted_preview style: colored watercolor template instead of line art
 * - season: seasonal keywords appended when the item description does not
 *   already mention the season (case-insensitive)
 *
 * @param {string} itemDescription - The item's description from the catalog
 * @param {string} styleKey - The style key ("" = classic)
 * @param {string} [season] - Optional season keyword ("spring"|"summer"|"autumn"|"winter")
 * @returns {string} The assembled prompt string
 */
export function buildColoringPrompt(itemDescription, styleKey, season) {
  // Add seasonal keywords if provided and not already in the description.
  let enhancedPrompt = itemDescription;
  const seasonal = season ? SEASONAL_KEYWORDS[season] : undefined;
  if (seasonal && !itemDescription.toLowerCase().includes(season.toLowerCase())) {
    enhancedPrompt = `${itemDescription}, ${seasonal}`;
  }

  const styleConfig = COLORING_STYLES[styleKey];

  let coloringPrompt;
  if (styleConfig && styleConfig.prompt) {
    // Special handling for painted preview style — generate colored artwork
    // instead of line art.
    if (styleKey === "painted_preview") {
      coloringPrompt = `${styleConfig.prompt}, beautiful illustration of ${enhancedPrompt}, artistic watercolor painting, gentle shading and highlights, professional coloring technique, harmonious color scheme, painterly style`;
    } else {
      // Put style at the BEGINNING for maximum priority and effect, and echo
      // it at the end to emphasize it to the model.
      coloringPrompt = `${styleConfig.prompt}, coloring page of ${enhancedPrompt}, black and white line art, no color, no shading, no grayscale, pure outlines only, EMPHASIZE THE STYLE: ${styleConfig.prompt}`;
    }
  } else {
    // For unstyled images, use the classic approach.
    coloringPrompt = `high contrast black and white line art coloring page, ${enhancedPrompt}, pure outlines with no shading, no color, no grayscale, thick clean lines, simple contours only`;
  }

  return coloringPrompt;
}

/**
 * Build a stable catalog cache key from style + seed params.
 *
 * Deterministic: the same style/seed pair always produces the same key, so
 * the client and content-api worker compute identical cache keys and hit the
 * same image. Uses the shared stringToHash (also used for image seeds) for
 * consistency across the codebase.
 *
 * @param {string} styleKey - The style key ("" = classic)
 * @param {string} seed - The seed value (string or number coerced)
 * @returns {string} The hex-based key (e.g., "a1b2c3")
 */
export function buildCatalogKey(styleKey, seed) {
  const combined = `coloring-${styleKey || "classic"}-${String(seed)}`;
  return stringToHash(combined).toString(16).padStart(6, "0");
}
