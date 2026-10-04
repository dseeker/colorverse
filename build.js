#!/usr/bin/env node
/**
 * ColorVerse Static Build Script
 *
 * Generates a complete static site with pre-generated content and downloaded images.
 * Two modes:
 *   - "live" (default): site generates content on the fly via AI APIs
 *   - "build": outputs dist/ with static JSON data + downloaded images
 *
 * Usage:
 *   node build.js                    # Full build (text + images)
 *   node build.js --text-only        # Generate text content only (skip images)
 *   node build.js --images-only      # Download images for existing site-data.json
 *   node build.js --categories 3     # Limit to first N categories (for testing)
 *   node build.js --concurrency 4    # Image download concurrency (default: 3)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration ---
const CONFIG = {
  apiKey: process.env.POLLINATIONS_API_KEY || "",
  textApiUrl: "https://gen.pollinations.ai/v1/chat/completions",
  imageApiUrl: "https://gen.pollinations.ai/image",
  distDir: path.join(__dirname, "dist"),
  imagesDir: path.join(__dirname, "dist", "images"),
  dataFile: path.join(__dirname, "dist", "site-data.json"),
  referrer: "dseeker.github.io",
  imageWidth: 1024,
  imageHeight: 1024,
  thumbWidth: 400,
  thumbHeight: 400,
  concurrency: 2, // Conservative default — reduce to stay under rate limits
  delayBetweenImages: 1500, // ms between requests within a batch (Seed tier = 1req/5s)
  model: "openai",
  imageModel: "flux",
};

// --- Category definitions (mirrors app.js getCategoryInfo) ---
const CATEGORIES = {
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

// --- Helpers ---
function stringToHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) {
    return "spring";
  }
  if (month >= 5 && month <= 7) {
    return "summer";
  }
  if (month >= 8 && month <= 10) {
    return "autumn";
  }
  return "winter";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeFilename(str) {
  return str
    .replace(/[^a-z0-9_-]/gi, "_")
    .substring(0, 80)
    .toLowerCase();
}

// --- AI Text Generation ---
async function callTextAPI(prompt, model = CONFIG.model) {
  const response = await fetch(CONFIG.textApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant that generates structured JSON data. Output ONLY the requested JSON object.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      referrer: CONFIG.referrer,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Text API ${response.status}: ${errorText.substring(0, 200)}`);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from text API");
  }

  return JSON.parse(content);
}

// --- Image Download ---
async function downloadImage(prompt, seed, outputPath, width, height) {
  const coloringPrompt = `high contrast black and white line art coloring page, ${prompt}, pure outlines with no shading, no color, no grayscale, thick clean lines, simple contours only`;

  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    nologo: "true",
    referrer: CONFIG.referrer,
    model: CONFIG.imageModel,
    key: CONFIG.apiKey,
    enhance: "true",
    quality: "medium",
  });

  const url = `${CONFIG.imageApiUrl}/${encodeURIComponent(coloringPrompt)}?${params}`;

  const MAX_RETRIES = 5;
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url);

    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);
      return buffer.length;
    }

    const status = response.status;
    const body = await response.text().catch(() => "");

    if (status === 429) {
      // Rate limited — respect Retry-After header or use exponential backoff
      const retryAfter =
        response.headers.get("retry-after") || response.headers.get("x-ratelimit-reset-after");
      const waitMs = retryAfter
        ? parseFloat(retryAfter) * 1000
        : Math.min(5000 * Math.pow(2, attempt - 1), 60000); // 5s, 10s, 20s, 40s, 60s
      process.stdout.write(
        `\n  ⏳ Rate limited (429). Waiting ${(waitMs / 1000).toFixed(0)}s before retry ${attempt}/${MAX_RETRIES}...`
      );
      await sleep(waitMs);
    } else if (status === 402) {
      // Balance exhausted — wait longer, balance may refill over time
      const waitMs = Math.min(60000 * attempt, 300000); // 1min, 2min, 3min, 4min, 5min
      process.stdout.write(
        `\n  💸 Balance exhausted (402). Waiting ${(waitMs / 1000).toFixed(0)}s before retry ${attempt}/${MAX_RETRIES}... [${body.substring(0, 80)}]`
      );
      await sleep(waitMs);
    } else {
      // Other error — short backoff, fewer retries
      lastError = new Error(`Image API ${status} for: ${prompt.substring(0, 60)}`);
      if (attempt < 3) {
        await sleep(2000 * attempt);
      } else {
        throw lastError;
      }
    }

    lastError = new Error(`Image API ${status} (attempt ${attempt}/${MAX_RETRIES})`);
  }

  throw lastError || new Error(`Image API failed after ${MAX_RETRIES} retries`);
}

// --- Generate category content ---
async function generateCategory(categoryKey, categoryInfo, itemCount = 20) {
  const prompt = `Generate coloring page data for the "${categoryKey}" category.
Output a JSON object with this structure:
{
  "title": "${categoryInfo.title}",
  "description": "${categoryInfo.description}",
  "keywords": ${JSON.stringify(categoryInfo.keywords)},
  "items": {
    "${categoryKey}_item_1": { "title": "Creative Unique Title", "description": "Detailed description for AI image generation" },
    ... exactly ${itemCount} items
  }
}

REQUIREMENTS:
- Exactly ${itemCount} items with keys "${categoryKey}_item_1" through "${categoryKey}_item_${itemCount}"
- Each title MUST be unique, creative, and evocative (NOT generic like "Sample" or "Item")
- Descriptions must be detailed enough for AI image generation of black and white coloring pages
- Include variety: some simple for beginners, some complex for advanced colorists

Output ONLY the JSON object.`;

  return callTextAPI(prompt);
}

// --- Parallel download with concurrency limit ---
async function downloadImagesParallel(tasks, concurrency, delayMs) {
  let completed = 0;
  const total = tasks.length;
  const results = [];

  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (task, batchIndex) => {
        // Stagger requests within a batch to avoid burst rate limiting
        if (batchIndex > 0) {
          await sleep(delayMs * batchIndex);
        }
        try {
          const size = await downloadImage(
            task.prompt,
            task.seed,
            task.outputPath,
            task.width,
            task.height
          );
          completed++;
          process.stdout.write(
            `\r  Images: ${completed}/${total} (${Math.round((completed / total) * 100)}%)`
          );
          return { path: task.relativePath, size };
        } catch (err) {
          completed++;
          process.stdout.write(
            `\r  Images: ${completed}/${total} (${Math.round((completed / total) * 100)}%)`
          );
          console.error(`\n  ⚠ Failed: ${task.prompt.substring(0, 50)}... - ${err.message}`);
          return null;
        }
      })
    );
    results.push(...batchResults.map(r => r.value));

    // Delay between batches to stay under rate limits
    if (i + concurrency < tasks.length) {
      await sleep(delayMs);
    }
  }
  console.log(""); // newline after progress
  return results.filter(Boolean);
}

// --- Main Build ---
async function build() {
  const args = process.argv.slice(2);
  const textOnly = args.includes("--text-only");
  const imagesOnly = args.includes("--images-only");
  const catLimit = args.includes("--categories")
    ? parseInt(args[args.indexOf("--categories") + 1])
    : null;
  const concurrency = args.includes("--concurrency")
    ? parseInt(args[args.indexOf("--concurrency") + 1])
    : CONFIG.concurrency;
  const delayMs = args.includes("--delay")
    ? parseInt(args[args.indexOf("--delay") + 1])
    : CONFIG.delayBetweenImages;

  if (!CONFIG.apiKey) {
    throw new Error(
      "POLLINATIONS_API_KEY is not set. Copy .env.example to .env and add your key, or export POLLINATIONS_API_KEY before running the build."
    );
  }

  console.log("╔══════════════════════════════════════════╗");
  console.log("║   ColorVerse Static Build                ║");
  console.log("╠══════════════════════════════════════════╣");
  console.log(
    `║  Mode: ${textOnly ? "text-only" : imagesOnly ? "images-only" : "full (text + images)"}`.padEnd(
      43
    ) + "║"
  );
  console.log(`║  Season: ${getCurrentSeason()}`.padEnd(43) + "║");
  console.log(`║  Image concurrency: ${concurrency}, delay: ${delayMs}ms`.padEnd(43) + "║");
  console.log("╚══════════════════════════════════════════╝");

  // Ensure dist directories exist
  fs.mkdirSync(CONFIG.imagesDir, { recursive: true });

  let siteData;

  // --- Step 1: Generate text content ---
  if (!imagesOnly) {
    console.log("\n📝 Step 1: Generating text content...\n");

    const categoryKeys = Object.keys(CATEGORIES);
    const categoriesToBuild = catLimit ? categoryKeys.slice(0, catLimit) : categoryKeys;

    const categories = {};
    for (let i = 0; i < categoriesToBuild.length; i++) {
      const key = categoriesToBuild[i];
      const info = CATEGORIES[key];
      process.stdout.write(`  [${i + 1}/${categoriesToBuild.length}] ${info.title}...`);

      try {
        const data = await generateCategory(key, info);
        categories[key] = data;
        const itemCount = data.items ? Object.keys(data.items).length : 0;
        console.log(` ✅ (${itemCount} items)`);
      } catch (err) {
        console.log(` ❌ ${err.message.substring(0, 80)}`);
        // Use fallback
        categories[key] = { ...info, items: {} };
      }

      // Rate limit between categories
      if (i < categoriesToBuild.length - 1) {
        await sleep(1500);
      }
    }

    // Generate seasonal gallery
    const season = getCurrentSeason();
    console.log(`\n  Generating ${season} seasonal gallery...`);
    try {
      const seasonalData = await callTextAPI(
        `Generate 12 seasonal coloring page items for ${season}. Output JSON: { "title": "${season} Collection", "subtitle": "Seasonal coloring pages", "items": { "seasonal_1": { "title": "...", "description": "..." }, ... 12 items } }. Titles must be creative and evocative.`
      );
      siteData = {
        brand: { name: "ColorVerse", tagline: "Free AI-Generated Coloring Pages" },
        seasonal_gallery: seasonalData,
        categories,
        _meta: {
          buildDate: new Date().toISOString(),
          season,
          categoryCount: Object.keys(categories).length,
          totalItems: Object.values(categories).reduce(
            (sum, c) => sum + Object.keys(c.items || {}).length,
            0
          ),
        },
      };
      console.log("  ✅ Seasonal gallery generated");
    } catch (err) {
      console.log(`  ⚠ Seasonal gallery failed: ${err.message.substring(0, 60)}`);
      siteData = {
        brand: { name: "ColorVerse", tagline: "Free AI-Generated Coloring Pages" },
        seasonal_gallery: { title: `${season} Collection`, items: {} },
        categories,
        _meta: {
          buildDate: new Date().toISOString(),
          season,
          categoryCount: Object.keys(categories).length,
          totalItems: Object.values(categories).reduce(
            (sum, c) => sum + Object.keys(c.items || {}).length,
            0
          ),
        },
      };
    }

    // Save site data
    fs.writeFileSync(CONFIG.dataFile, JSON.stringify(siteData, null, 2));
    console.log(
      `\n  💾 Saved: dist/site-data.json (${siteData._meta.totalItems} items across ${siteData._meta.categoryCount} categories)`
    );
  } else {
    // Load existing site data for images-only mode
    if (!fs.existsSync(CONFIG.dataFile)) {
      console.error("❌ No dist/site-data.json found. Run without --images-only first.");
      process.exit(1);
    }
    siteData = JSON.parse(fs.readFileSync(CONFIG.dataFile, "utf-8"));
    console.log(`\n📂 Loaded existing site-data.json (${siteData._meta?.totalItems || "?"} items)`);
  }

  // --- Step 1.5: Generate sitemap.xml ---
  // Mirrors src/services/seoManager.js generateSitemap() so robots.txt's sitemap
  // reference (https://dseeker.github.io/colorverse/sitemap.xml) actually resolves.
  {
    const today = new Date().toISOString().split("T")[0];
    const base = "https://dseeker.github.io/colorverse";
    const urls = [{ loc: `${base}/`, lastmod: today, changefreq: "daily", priority: "1.0" }];
    for (const catKey of Object.keys(siteData.categories || {})) {
      urls.push({
        loc: `${base}/#category/${catKey}`,
        lastmod: today,
        changefreq: "weekly",
        priority: "0.8",
      });
    }
    for (const [catKey, catData] of Object.entries(siteData.categories || {})) {
      for (const itemKey of Object.keys(catData.items || {})) {
        urls.push({
          loc: `${base}/#item/${catKey}/${itemKey}`,
          lastmod: today,
          changefreq: "monthly",
          priority: "0.6",
        });
      }
    }
    if (siteData.seasonal_gallery?.items) {
      for (const itemKey of Object.keys(siteData.seasonal_gallery.items)) {
        urls.push({
          loc: `${base}/#item/seasonal/${itemKey}`,
          lastmod: today,
          changefreq: "monthly",
          priority: "0.6",
        });
      }
    }
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .map(
          u =>
            `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
        )
        .join("\n") +
      `\n</urlset>\n`;
    fs.writeFileSync(path.join(CONFIG.distDir, "sitemap.xml"), xml);
    console.log(`🗺️  Generated dist/sitemap.xml (${urls.length} urls)`);
  }

  // --- Step 2: Download images ---
  if (!textOnly) {
    console.log("\n🖼️  Step 2: Downloading images...\n");

    const imageTasks = [];

    // Collect all image download tasks
    for (const [catKey, catData] of Object.entries(siteData.categories || {})) {
      const catDir = path.join(CONFIG.imagesDir, catKey);
      fs.mkdirSync(catDir, { recursive: true });

      for (const [itemKey, item] of Object.entries(catData.items || {})) {
        const description = item.description || item.title || "";
        const seed = stringToHash(itemKey);
        const filename = `${sanitizeFilename(itemKey)}.jpg`;
        const outputPath = path.join(catDir, filename);

        // Skip if already downloaded
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
          continue;
        }

        imageTasks.push({
          prompt: description,
          seed,
          outputPath,
          relativePath: `images/${catKey}/${filename}`,
          width: CONFIG.imageWidth,
          height: CONFIG.imageHeight,
        });
      }
    }

    // Also download seasonal images
    const seasonalDir = path.join(CONFIG.imagesDir, "seasonal");
    fs.mkdirSync(seasonalDir, { recursive: true });
    for (const [itemKey, item] of Object.entries(siteData.seasonal_gallery?.items || {})) {
      const description = item.description || item.title || "";
      const seed = stringToHash(itemKey);
      const filename = `${sanitizeFilename(itemKey)}.jpg`;
      const outputPath = path.join(seasonalDir, filename);

      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
        continue;
      }

      imageTasks.push({
        prompt: description,
        seed,
        outputPath,
        relativePath: `images/seasonal/${filename}`,
        width: CONFIG.thumbWidth,
        height: CONFIG.thumbHeight,
      });
    }

    if (imageTasks.length === 0) {
      console.log("  All images already downloaded. Nothing to do.");
    } else {
      console.log(`  ${imageTasks.length} images to download (concurrency: ${concurrency})...\n`);
      const results = await downloadImagesParallel(imageTasks, concurrency, delayMs);
      const totalSize = results.reduce((sum, r) => sum + (r?.size || 0), 0);
      console.log(
        `  ✅ Downloaded ${results.length} images (${(totalSize / 1024 / 1024).toFixed(1)} MB)`
      );
    }
  }

  // --- Step 3: Copy static assets ---
  console.log("\n📁 Step 3: Copying static assets...");

  const filesToCopy = [
    "index.html",
    "app.js",
    "service-worker.js",
    "service-worker-register.js",
    "robots.txt",
    "favicon.svg",
    "offline.html",
  ];

  // Copy src/ folder
  const srcDirs = ["src/modules", "src/services"];
  for (const dir of srcDirs) {
    const srcPath = path.join(__dirname, dir);
    const destPath = path.join(CONFIG.distDir, dir);
    fs.mkdirSync(destPath, { recursive: true });
    if (fs.existsSync(srcPath)) {
      for (const file of fs.readdirSync(srcPath)) {
        fs.copyFileSync(path.join(srcPath, file), path.join(destPath, file));
      }
    }
  }

  for (const file of filesToCopy) {
    const src = path.join(__dirname, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(CONFIG.distDir, file));
    }
  }

  // --- Step 4: Inject static mode into dist/index.html ---
  const distIndexPath = path.join(CONFIG.distDir, "index.html");
  let indexContent = fs.readFileSync(distIndexPath, "utf-8");

  // Add a script that pre-loads site data from JSON (before app.js runs)
  const staticModeScript = `
    <script>
        // Static build mode - pre-generated content loaded from JSON
        window.__COLORVERSE_STATIC__ = true;
        window.__COLORVERSE_DATA_URL__ = 'https://colorverse-image-proxy.daniel-bca.workers.dev/data';
        window.__COLORVERSE_IMAGES_BASE__ = './images';
    </script>`;

  // Insert before the app.js script tag
  indexContent = indexContent.replace(
    '    <script src="src/modules/aiProviders.js"></script>',
    `${staticModeScript}\n    <script src="src/modules/aiProviders.js"></script>`
  );
  fs.writeFileSync(distIndexPath, indexContent);

  // --- Summary ---
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   ✅ Build Complete                      ║");
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║  Output: ./dist/`.padEnd(43) + "║");
  console.log(`║  Categories: ${Object.keys(siteData.categories || {}).length}`.padEnd(43) + "║");
  console.log(`║  Total items: ${siteData._meta?.totalItems || "?"}`.padEnd(43) + "║");
  console.log("╠══════════════════════════════════════════╣");
  console.log("║  To serve locally:                       ║");
  console.log("║    npx serve dist                        ║");
  console.log("╚══════════════════════════════════════════╝");
}

build().catch(err => {
  console.error("\n❌ Build failed:", err.message);
  process.exit(1);
});
