/**
 * Pencil color matcher for ColorVerse palettes.
 * Maps palette hex colors to the nearest pencil in the catalog.
 * Falls back to a translated generic color name when no pencil is close enough.
 */

import { getAllPencils, getSetById } from "../data/pencilSets.js";

// Max squared RGB distance to still consider a pencil match valid.
// Above this threshold, fall back to a generic color name.
const MAX_DISTANCE_SQ = 10000;

/**
 * Convert a hex string (#RRGGBB) to {r, g, b}.
 */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") {
    return null;
  }
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length !== 6) {
    return null;
  }
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  if ([r, g, b].some(n => Number.isNaN(n))) {
    return null;
  }
  return { r, g, b };
}

/**
 * Squared Euclidean distance between two hex colors in RGB space.
 */
export function colorDistanceSq(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) {
    return Infinity;
  }
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

/**
 * Find the nearest pencil in the catalog to a given hex color.
 * Returns {number, name, hex, brand, setId, distanceSq} or null if no match within threshold.
 */
export function findNearestPencil(hex) {
  const all = getAllPencils();
  if (!all || all.length === 0) {
    return null;
  }
  let best = null;
  let bestDist = Infinity;
  for (const pencil of all) {
    const d = colorDistanceSq(hex, pencil.hex);
    if (d < bestDist) {
      bestDist = d;
      best = { ...pencil, distanceSq: d };
    }
  }
  if (!best || best.distanceSq > MAX_DISTANCE_SQ) {
    return null;
  }
  return best;
}

/**
 * Find the nearest pencil scoped to a single set (used by future Pencil Library feature).
 */
export function findNearestPencilBySet(hex, setId) {
  const set = getSetById(setId);
  if (!set || !set.colors) {
    return null;
  }
  let best = null;
  let bestDist = Infinity;
  for (const color of set.colors) {
    const d = colorDistanceSq(hex, color.hex);
    if (d < bestDist) {
      bestDist = d;
      best = { ...color, brand: set.brand, setId: set.id, distanceSq: d };
    }
  }
  if (!best || best.distanceSq > MAX_DISTANCE_SQ) {
    return null;
  }
  return best;
}

/**
 * Convert a hex color to HSL {h: 0-360, s: 0-1, l: 0-1}.
 */
function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return null;
  }
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        h = 0;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }
  return { h, s, l };
}

/**
 * Map a hex color to a translated generic color name.
 * Uses HSL hue bucketing + lightness for black/white/gray.
 * Returns a translation key string like "color.red" to be passed to window.t().
 */
export function genericColorNameKey(hex) {
  const hsl = hexToHsl(hex);
  if (!hsl) {
    return "color.unknown";
  }
  // Near-white / near-black / gray
  if (hsl.s < 0.12) {
    if (hsl.l >= 0.85) {
      return "color.white";
    }
    if (hsl.l <= 0.15) {
      return "color.black";
    }
    return "color.gray";
  }
  // Browns: low lightness + orange/yellow hue
  if (hsl.l < 0.35 && (hsl.h < 45 || hsl.h > 330)) {
    return "color.brown";
  }
  const h = hsl.h;
  if (h < 15 || h >= 345) {
    return "color.red";
  }
  if (h < 45) {
    return "color.orange";
  }
  if (h < 70) {
    return "color.yellow";
  }
  if (h < 165) {
    return "color.green";
  }
  if (h < 200) {
    return "color.cyan";
  }
  if (h < 255) {
    return "color.blue";
  }
  if (h < 290) {
    return "color.purple";
  }
  if (h < 330) {
    return "color.pink";
  }
  return "color.red";
}

/**
 * Resolve a generic color name via i18n, with fallback to the key's English suffix.
 */
export function genericColorName(hex) {
  const key = genericColorNameKey(hex);
  if (typeof window !== "undefined" && typeof window.t === "function") {
    return window.t(key) || key.replace("color.", "");
  }
  return key.replace("color.", "");
}

/**
 * Build a display label for a palette color.
 * Returns "PC939 Coral Sea" if a pencil matches, else the generic translated color name.
 */
export function formatPencilLabel(hex) {
  const match = findNearestPencil(hex);
  if (match) {
    return `${match.number} ${match.name}`;
  }
  return genericColorName(hex);
}

export default {
  hexToRgb,
  colorDistanceSq,
  findNearestPencil,
  findNearestPencilBySet,
  genericColorName,
  genericColorNameKey,
  formatPencilLabel,
};
