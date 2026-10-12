export const CACHE_DURATIONS = {
  IMAGE: 604800,
  CONTENT: 86400,
  CATEGORY: 86400,
};

export const REGENERATION_CYCLE = {
  HOURS: 48,
  MS: 48 * 60 * 60 * 1000,
};

export const POLLINATIONS_CONFIG = {
  IMAGE_BASE_URL: "https://gen.pollinations.ai/image",
  TEXT_BASE_URL: "https://gen.pollinations.ai/v1/chat/completions",
  // Default model used by build.js for catalog/image generation.
  // Image-proxy worker uses the new CF AI -> Pollinations fallback chain instead.
  DEFAULT_MODEL: "microsoft/mai-image-2.6-flash",
  TIMEOUT: 30000,
};

// Primary: CF Workers AI (in-network, no API key, ~104 neurons/image -> 96 free/day on 10k neurons)
export const CF_AI_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";

// Fallback: Pollinations (Bearer auth, ~1s response time vs 5s for ?key=)
export const POLLINATIONS_MODEL_FALLBACKS = [
  "microsoft/mai-image-2.6-flash", // MAI-flash (12s, user-preferred quality)
  "microsoft/mai-image-2.6", // MAI full (25s, highest quality)
  "black-forest-labs/flux.1-schnell", // Pollinations Flux (4s, fast fallback)
];

export const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#f0f0f0"/>
  <text x="50%" y="45%" font-size="16" text-anchor="middle" fill="#999" font-family="sans-serif">Image Loading...</text>
  <text x="50%" y="55%" font-size="12" text-anchor="middle" fill="#ccc" font-family="sans-serif">Please wait or refresh</text>
</svg>`;

export const ERROR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#fff0f0"/>
  <text x="50%" y="45%" font-size="16" text-anchor="middle" fill="#c00" font-family="sans-serif">Image Error</text>
  <text x="50%" y="55%" font-size="12" text-anchor="middle" fill="#999" font-family="sans-serif">Click to retry</text>
</svg>`;

export const CATEGORY_KEYS = [
  "animals",
  "fantasy",
  "mandalas",
  "vehicles",
  "nature",
  "food",
  "space",
  "abstract",
  "flowers",
  "ocean",
  "dinosaurs",
  "mythical",
  "birds",
  "architecture",
  "sports",
  "memes",
  "adult_zen",
  "spicy_bold",
  "children_characters",
  "vintage_retro",
  "gaming_tech",
  "holidays",
  "music_dance",
  "steampunk",
  "tribal_ethnic",
];

/**
 * Difficulty levels for category complexity.
 *
 * @type {["easy" | "medium" | "hard", "easy" | "medium" | "hard", "easy" | "medium" | "hard"]}
 */
export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"];

/**
 * Full category definitions (title, description, keywords, difficulty).
 *
 * Single source of truth shared by build.js (catalog generation), the
 * content-api worker (catalog responses), and the client. Ported from the
 * CATEGORIES table in build.js — keep in sync if a category changes.
 *
 * @typedef {Object} CategoryDef
 * @property {string} title - Display title
 * @property {string} description - Human-facing description
 * @property {string[]} keywords - Search keywords (lowercase, trimmed, deduplicated)
 * @property {"easy" | "medium" | "hard"} difficulty - Visual complexity level
 */

/** @type {Record<string, CategoryDef>} */
const CATEGORY_DEFS = {
  animals: {
    title: "Animal Kingdom",
    description: "Discover the wonderful world of animals from cute pets to wild creatures.",
    keywords: ["animals", "wildlife", "pets", "zoo", "creatures"],
    difficulty: "medium",
  },
  fantasy: {
    title: "Fantasy & Magic",
    description: "Enter magical realms filled with dragons, unicorns, and mystical adventures.",
    keywords: ["fantasy", "magic", "dragons", "unicorns", "mystical"],
    difficulty: "medium",
  },
  mandalas: {
    title: "Mandala Meditation",
    description: "Find peace and focus with intricate mandala patterns for mindful coloring.",
    keywords: ["mandalas", "meditation", "patterns", "zen", "mindfulness"],
    difficulty: "hard",
  },
  vehicles: {
    title: "Vehicles & Transportation",
    description: "Explore cars, trucks, planes, and all kinds of amazing vehicles.",
    keywords: ["vehicles", "cars", "trucks", "planes", "transportation"],
    difficulty: "medium",
  },
  nature: {
    title: "Nature & Landscapes",
    description: "Beautiful scenes from nature including forests, mountains, and gardens.",
    keywords: ["nature", "landscapes", "trees", "flowers", "outdoors"],
    difficulty: "medium",
  },
  food: {
    title: "Delicious Food & Treats",
    description: "Tasty treats, healthy foods, and culinary delights to color.",
    keywords: ["food", "treats", "cooking", "desserts", "cuisine"],
    difficulty: "easy",
  },
  space: {
    title: "Space & Astronomy",
    description: "Blast off to explore planets, stars, and cosmic adventures.",
    keywords: ["space", "planets", "stars", "astronomy", "rockets"],
    difficulty: "medium",
  },
  abstract: {
    title: "Abstract Art",
    description: "Creative abstract designs and artistic patterns for imagination.",
    keywords: ["abstract", "art", "patterns", "creative", "artistic"],
    difficulty: "medium",
  },
  flowers: {
    title: "Beautiful Flowers",
    description: "Gorgeous floral designs from simple blooms to elaborate bouquets.",
    keywords: ["flowers", "floral", "gardens", "blooms", "botanical"],
    difficulty: "medium",
  },
  ocean: {
    title: "Ocean & Sea Life",
    description: "Dive into underwater worlds filled with sea creatures and coral reefs.",
    keywords: ["ocean", "sea", "marine", "underwater", "aquatic"],
    difficulty: "medium",
  },
  dinosaurs: {
    title: "Prehistoric Dinosaurs",
    description: "Travel back in time to the age of mighty dinosaurs and ancient creatures.",
    keywords: ["dinosaurs", "prehistoric", "fossils", "ancient", "paleontology"],
    difficulty: "medium",
  },
  mythical: {
    title: "Mythical Creatures",
    description: "Legendary beings from folklore and mythology around the world.",
    keywords: ["mythical", "legends", "folklore", "creatures", "mythology"],
    difficulty: "medium",
  },
  birds: {
    title: "Birds & Flight",
    description: "Soar with beautiful birds from tiny hummingbirds to majestic eagles.",
    keywords: ["birds", "flight", "wings", "feathers", "avian"],
    difficulty: "medium",
  },
  architecture: {
    title: "Buildings & Architecture",
    description: "Explore amazing buildings, castles, and architectural wonders.",
    keywords: ["architecture", "buildings", "castles", "monuments", "structures"],
    difficulty: "medium",
  },
  sports: {
    title: "Sports & Recreation",
    description: "Active sports, games, and recreational activities for all ages.",
    keywords: ["sports", "games", "recreation", "athletics", "competition"],
    difficulty: "easy",
  },
  memes: {
    title: "Internet Memes & Pop Culture",
    description: "Fun and trendy internet memes, viral content, and pop culture references.",
    keywords: ["memes", "internet", "viral", "trending", "pop culture"],
    difficulty: "easy",
  },
  adult_zen: {
    title: "Adult Zen & Sophistication",
    description: "Complex, sophisticated designs for adult colorists seeking detailed meditation.",
    keywords: ["adult", "sophisticated", "complex", "detailed", "zen"],
    difficulty: "hard",
  },
  spicy_bold: {
    title: "Bold & Spicy Designs",
    description: "Edgy, bold patterns with attitude - skulls, tattoo-style, and rock themes.",
    keywords: ["bold", "edgy", "skulls", "tattoo", "rock"],
    difficulty: "medium",
  },
  children_characters: {
    title: "Cute Children's Characters",
    description:
      "Beloved children's characters and friendly cartoon companions for young colorists.",
    keywords: ["children", "characters", "cartoon", "friendly", "kids"],
    difficulty: "easy",
  },
  vintage_retro: {
    title: "Vintage & Retro Vibes",
    description: "Nostalgic designs from past decades with classic style and charm.",
    keywords: ["vintage", "retro", "classic", "nostalgic", "antique"],
    difficulty: "medium",
  },
  gaming_tech: {
    title: "Gaming & Technology",
    description: "Video game characters, retro gaming, robots, and futuristic technology.",
    keywords: ["gaming", "technology", "robots", "futuristic", "digital"],
    difficulty: "medium",
  },
  holidays: {
    title: "Holidays & Celebrations",
    description: "Festive designs for all holidays and special celebrations year-round.",
    keywords: ["holidays", "celebrations", "festive", "seasonal", "traditions"],
    difficulty: "medium",
  },
  music_dance: {
    title: "Music & Dance",
    description: "Musical instruments, dance poses, and rhythm-inspired artistic designs.",
    keywords: ["music", "dance", "instruments", "rhythm", "performance"],
    difficulty: "medium",
  },
  steampunk: {
    title: "Steampunk & Victorian",
    description: "Intricate steampunk machinery, Victorian elegance, and clockwork mechanisms.",
    keywords: ["steampunk", "victorian", "gears", "clockwork", "mechanical"],
    difficulty: "hard",
  },
  tribal_ethnic: {
    title: "Tribal & Cultural Patterns",
    description: "Beautiful traditional patterns and designs from cultures around the world.",
    keywords: ["tribal", "cultural", "traditional", "ethnic", "patterns"],
    difficulty: "medium",
  },
};

/**
 * Exported CATEGORIES, ordered by CATEGORY_KEYS so iteration order matches
 * the canonical category list (and stays in sync with it).
 * @type {Record<string, CategoryDef>}
 */
export const CATEGORIES = Object.fromEntries(
  CATEGORY_KEYS.map(key => [key, CATEGORY_DEFS[key]]).filter(([, def]) => def !== undefined)
);

/**
 * Build a flat tag-to-category index from all category keywords.
 * Each tag (lowercase, normalized) maps to an array of category keys that use it.
 * Built at module load from CATEGORY_DEFS so it stays in sync automatically.
 */
export const TAG_INDEX = Object.entries(CATEGORY_DEFS).reduce((acc, [catKey, def]) => {
  for (const kw of def.keywords) {
    const tag = kw.toLowerCase().trim();
    if (!acc[tag]) {
      acc[tag] = [];
    }
    if (!acc[tag].includes(catKey)) {
      acc[tag].push(catKey);
    }
  }
  return acc;
}, Object.create(null));

/**
 * Sanity check: every CATEGORY_KEY must have a definition (and vice versa).
 * Runs at module load; throws on mismatch so a partial port fails fast.
 */
for (const key of CATEGORY_KEYS) {
  if (!CATEGORIES[key]) {
    throw new Error(`CATEGORIES missing definition for CATEGORY_KEY: ${key}`);
  }
}
if (Object.keys(CATEGORIES).length !== CATEGORY_KEYS.length) {
  throw new Error(
    `CATEGORIES count (${Object.keys(CATEGORIES).length}) != CATEGORY_KEYS count (${CATEGORY_KEYS.length})`
  );
}
