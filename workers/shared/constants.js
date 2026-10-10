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
  // Model fallback chain (try in order; first 200 wins).
  // Decided 2026-10-09 after visual comparison of 24 test images.
  DEFAULT_MODEL: "microsoft/mai-image-2.6-flash",
  IMAGE_MODEL_FALLBACKS: [
    "microsoft/mai-image-2.6-flash",
    "microsoft/mai-image-2.6",
    "openai/gpt-image-2",
    "black-forest-labs/flux.1-schnell",
  ],
  TIMEOUT: 30000,
};

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
 * Full category definitions (title, description, keywords).
 *
 * Single source of truth shared by build.js (catalog generation), the
 * content-api worker (catalog responses), and the client. Ported from the
 * CATEGORIES table in build.js — keep in sync if a category changes.
 *
 * @typedef {Object} CategoryDef
 * @property {string} title - Display title
 * @property {string} description - Human-facing description
 * @property {string[]} keywords - Search keywords
 */

/** @type {Record<string, CategoryDef>} */
const CATEGORY_DEFS = {
  animals: {
    title: "Animal Kingdom",
    description: "Discover the wonderful world of animals from cute pets to wild creatures.",
    keywords: ["animals", "wildlife", "pets", "zoo", "creatures"],
  },
  fantasy: {
    title: "Fantasy & Magic",
    description: "Enter magical realms filled with dragons, unicorns, and mystical adventures.",
    keywords: ["fantasy", "magic", "dragons", "unicorns", "mystical"],
  },
  mandalas: {
    title: "Mandala Meditation",
    description: "Find peace and focus with intricate mandala patterns for mindful coloring.",
    keywords: ["mandalas", "meditation", "patterns", "zen", "mindfulness"],
  },
  vehicles: {
    title: "Vehicles & Transportation",
    description: "Explore cars, trucks, planes, and all kinds of amazing vehicles.",
    keywords: ["vehicles", "cars", "trucks", "planes", "transportation"],
  },
  nature: {
    title: "Nature & Landscapes",
    description: "Beautiful scenes from nature including forests, mountains, and gardens.",
    keywords: ["nature", "landscapes", "trees", "flowers", "outdoors"],
  },
  food: {
    title: "Delicious Food & Treats",
    description: "Tasty treats, healthy foods, and culinary delights to color.",
    keywords: ["food", "treats", "cooking", "desserts", "cuisine"],
  },
  space: {
    title: "Space & Astronomy",
    description: "Blast off to explore planets, stars, and cosmic adventures.",
    keywords: ["space", "planets", "stars", "astronomy", "rockets"],
  },
  abstract: {
    title: "Abstract Art",
    description: "Creative abstract designs and artistic patterns for imagination.",
    keywords: ["abstract", "art", "patterns", "creative", "artistic"],
  },
  flowers: {
    title: "Beautiful Flowers",
    description: "Gorgeous floral designs from simple blooms to elaborate bouquets.",
    keywords: ["flowers", "floral", "gardens", "blooms", "botanical"],
  },
  ocean: {
    title: "Ocean & Sea Life",
    description: "Dive into underwater worlds filled with sea creatures and coral reefs.",
    keywords: ["ocean", "sea", "marine", "underwater", "aquatic"],
  },
  dinosaurs: {
    title: "Prehistoric Dinosaurs",
    description: "Travel back in time to the age of mighty dinosaurs and ancient creatures.",
    keywords: ["dinosaurs", "prehistoric", "fossils", "ancient", "paleontology"],
  },
  mythical: {
    title: "Mythical Creatures",
    description: "Legendary beings from folklore and mythology around the world.",
    keywords: ["mythical", "legends", "folklore", "creatures", "mythology"],
  },
  birds: {
    title: "Birds & Flight",
    description: "Soar with beautiful birds from tiny hummingbirds to majestic eagles.",
    keywords: ["birds", "flight", "wings", "feathers", "avian"],
  },
  architecture: {
    title: "Buildings & Architecture",
    description: "Explore amazing buildings, castles, and architectural wonders.",
    keywords: ["architecture", "buildings", "castles", "monuments", "structures"],
  },
  sports: {
    title: "Sports & Recreation",
    description: "Active sports, games, and recreational activities for all ages.",
    keywords: ["sports", "games", "recreation", "athletics", "competition"],
  },
  memes: {
    title: "Internet Memes & Pop Culture",
    description: "Fun and trendy internet memes, viral content, and pop culture references.",
    keywords: ["memes", "internet", "viral", "trending", "pop culture"],
  },
  adult_zen: {
    title: "Adult Zen & Sophistication",
    description: "Complex, sophisticated designs for adult colorists seeking detailed meditation.",
    keywords: ["adult", "sophisticated", "complex", "detailed", "zen"],
  },
  spicy_bold: {
    title: "Bold & Spicy Designs",
    description: "Edgy, bold patterns with attitude - skulls, tattoo-style, and rock themes.",
    keywords: ["bold", "edgy", "skulls", "tattoo", "rock"],
  },
  children_characters: {
    title: "Cute Children's Characters",
    description:
      "Beloved children's characters and friendly cartoon companions for young colorists.",
    keywords: ["children", "characters", "cartoon", "friendly", "kids"],
  },
  vintage_retro: {
    title: "Vintage & Retro Vibes",
    description: "Nostalgic designs from past decades with classic style and charm.",
    keywords: ["vintage", "retro", "classic", "nostalgic", "antique"],
  },
  gaming_tech: {
    title: "Gaming & Technology",
    description: "Video game characters, retro gaming, robots, and futuristic technology.",
    keywords: ["gaming", "technology", "robots", "futuristic", "digital"],
  },
  holidays: {
    title: "Holidays & Celebrations",
    description: "Festive designs for all holidays and special celebrations year-round.",
    keywords: ["holidays", "celebrations", "festive", "seasonal", "traditions"],
  },
  music_dance: {
    title: "Music & Dance",
    description: "Musical instruments, dance poses, and rhythm-inspired artistic designs.",
    keywords: ["music", "dance", "instruments", "rhythm", "performance"],
  },
  steampunk: {
    title: "Steampunk & Victorian",
    description: "Intricate steampunk machinery, Victorian elegance, and clockwork mechanisms.",
    keywords: ["steampunk", "victorian", "gears", "clockwork", "mechanical"],
  },
  tribal_ethnic: {
    title: "Tribal & Cultural Patterns",
    description: "Beautiful traditional patterns and designs from cultures around the world.",
    keywords: ["tribal", "cultural", "traditional", "ethnic", "patterns"],
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
