/**
 * Curated color palettes for ColorVerse
 * Each palette contains a set of hex colors for inspiration and quick selection.
 */

export const palettes = [
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm oranges and pinks reminiscent of a golden hour sky",
    colors: ["#FF6B6B", "#FFA07A", "#FFD700", "#FF4500", "#DC143C"],
    category: "warm",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Deep greens and earthy browns for nature scenes",
    colors: ["#228B22", "#006400", "#8B4513", "#556B2F", "#6B8E23"],
    category: "earth",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Cool blues and teals inspired by the sea",
    colors: ["#006994", "#1E90FF", "#20B2AA", "#008B8B", "#4169E1"],
    category: "cool",
  },
  {
    id: "pastel-dream",
    name: "Pastel Dream",
    description: "Soft, muted pastels for gentle coloring",
    colors: ["#FFB6C1", "#B6E2FF", "#E6E6FA", "#FFDAB9", "#98FB98"],
    category: "pastel",
  },
  {
    id: "autumn",
    name: "Autumn",
    description: "Rich fall colors with oranges, reds, and browns",
    colors: ["#B22222", "#D2691E", "#CD853F", "#FF8C00", "#8B0000"],
    category: "earth",
  },
  {
    id: "neon",
    name: "Neon",
    description: "Vibrant, electric colors that pop",
    colors: ["#FF073A", "#39FF14", "#00FFFF", "#FF00FF", "#FFFF00"],
    category: "vibrant",
  },
  {
    id: "monochrome",
    name: "Monochrome",
    description: "Grayscale tones for elegant black-and-white styling",
    colors: ["#000000", "#333333", "#666666", "#999999", "#CCCCCC"],
    category: "muted",
  },
  {
    id: "earth-tones",
    name: "Earth Tones",
    description: "Natural browns, tans, and ochres",
    colors: ["#8B4513", "#D2B48C", "#DEB887", "#A0522D", "#F4A460"],
    category: "earth",
  },
  {
    id: "cotton-candy",
    name: "Cotton Candy",
    description: "Playful pinks, blues, and lavenders",
    colors: ["#FF69B4", "#DA70D6", "#BA55D3", "#87CEEB", "#FFB6C1"],
    category: "pastel",
  },
  {
    id: "jewel-tones",
    name: "Jewel Tones",
    description: "Rich, saturated colors inspired by gemstones",
    colors: ["#6B0049", "#006400", "#0000FF", "#B8860B", "#8B0000"],
    category: "vibrant",
  },
  {
    id: "muted-sage",
    name: "Muted Sage",
    description: "Subtle greens and grays for a calm aesthetic",
    colors: ["#8FBC8F", "#778899", "#B0C4DE", "#9ACD32", "#808080"],
    category: "muted",
  },
  {
    id: "berry-mix",
    name: "Berry Mix",
    description: "Deep reds, purples, and berries",
    colors: ["#8B0000", "#4B0082", "#9400D3", "#800020", "#C71585"],
    category: "vibrant",
  },
  {
    id: "desert",
    name: "Desert",
    description: "Warm sandy tones and desert flora colors",
    colors: ["#EDC9AF", "#D2B48C", "#C19A6B", "#F4A460", "#DEB887"],
    category: "earth",
  },
  {
    id: "twilight",
    name: "Twilight",
    description: "Dusk purples, deep blues, and soft pinks",
    colors: ["#4B0082", "#483D8B", "#7B68EE", "#DDA0DD", "#B0C4DE"],
    category: "cool",
  },
  {
    id: "coral-reef",
    name: "Coral Reef",
    description: "Vibrant coral, sea green, and ocean colors",
    colors: ["#FF7F50", "#20B2AA", "#FF6347", "#00CED1", "#FF4500"],
    category: "vibrant",
  },
];

/**
 * Get a palette by its unique ID
 */
export function getById(id) {
  return palettes.find(p => p.id === id) || null;
}

/**
 * Get all palettes filtered by category
 */
export function getByCategory(category) {
  return palettes.filter(p => p.category === category);
}

/**
 * Get all unique categories available
 */
export function getCategories() {
  return [...new Set(palettes.map(p => p.category))];
}

/**
 * Get a random palette (optionally filtered by category)
 */
export function getRandom(category) {
  const filtered = category ? getByCategory(category) : palettes;
  if (filtered.length === 0) {
    return null;
  }
  return filtered[Math.floor(Math.random() * filtered.length)];
}
