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
