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
 *   node scripts/build.js                    # Full build (text + images)
 *   node scripts/build.js --text-only        # Generate text content only (skip images)
 *   node scripts/build.js --images-only      # Download images for existing site-data.json
 *   node scripts/build.js --package-only     # Package existing site data without API calls
 *   node scripts/build.js --package-only --data-file tests/build/fixtures/site-data.json
 *   node scripts/build.js --categories 3     # Limit to first N categories (for testing)
 *   node scripts/build.js --concurrency 4    # Image download concurrency (default: 3)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import {
  stringToHash,
  getCurrentSeason,
  sleep,
  fetchWithTimeout,
} from "../workers/shared/utils.js";
import { CATEGORIES, CATEGORY_KEYS, POLLINATIONS_CONFIG } from "../workers/shared/constants.js";

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(__filename), "..");
dotenv.config({ path: path.join(ROOT_DIR, ".env") });

// --- Configuration ---
// API endpoints + image model chain come from the shared constants
// (workers/shared/constants.js) so build.js and the CF Workers never drift.
const CONFIG = {
  apiKey: process.env.POLLINATIONS_API_KEY || "",
  textApiUrl: POLLINATIONS_CONFIG.TEXT_BASE_URL,
  imageApiUrl: POLLINATIONS_CONFIG.IMAGE_BASE_URL,
  distDir: path.join(ROOT_DIR, "dist"),
  imagesDir: path.join(ROOT_DIR, "dist", "images"),
  dataFile: path.join(ROOT_DIR, "dist", "site-data.json"),
  referrer: "dseeker.github.io",
  imageWidth: 1024,
  imageHeight: 1024,
  thumbWidth: 400,
  thumbHeight: 400,
  concurrency: 2, // Conservative default — reduce to stay under rate limits
  delayBetweenImages: 1500, // ms between requests within a batch (Seed tier = 1req/5s)
  model: "openai",
  // Model fallback chain (first 200 wins). Decided 2026-10-09.
  imageModel: POLLINATIONS_CONFIG.DEFAULT_MODEL,
  imageModelFallbacks: POLLINATIONS_CONFIG.IMAGE_MODEL_FALLBACKS,
};

const REQUIRED_ROOT_ASSETS = [
  ".nojekyll",
  "index.html",
  "service-worker.js",
  "service-worker-register.js",
  "robots.txt",
  "favicon.svg",
  "offline.html",
];

const RUNTIME_SOURCE_DIRS = ["modules", "services", "shared", "data"];

function getOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function requirePath(sourcePath, description) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Required ${description} is missing: ${sourcePath}`);
  }
}

function copyDirectory(sourceDir, destinationDir, description) {
  requirePath(sourceDir, description);
  if (!fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`Required ${description} is not a directory: ${sourceDir}`);
  }
  fs.cpSync(sourceDir, destinationDir, { recursive: true });
}

function copyRuntimeAssets(outputDir, { includeImages = true } = {}) {
  for (const relativePath of REQUIRED_ROOT_ASSETS) {
    const sourcePath = path.join(ROOT_DIR, relativePath);
    requirePath(sourcePath, `runtime asset "${relativePath}"`);
    fs.copyFileSync(sourcePath, path.join(outputDir, relativePath));
  }

  const appPath = path.join(ROOT_DIR, "src", "app.js");
  requirePath(appPath, 'runtime entrypoint "src/app.js"');
  fs.mkdirSync(path.join(outputDir, "src"), { recursive: true });
  fs.copyFileSync(appPath, path.join(outputDir, "src", "app.js"));
  const legacyAppPath = path.join(outputDir, "app.js");
  if (fs.existsSync(legacyAppPath)) {
    fs.unlinkSync(legacyAppPath);
  }

  for (const directory of RUNTIME_SOURCE_DIRS) {
    copyDirectory(
      path.join(ROOT_DIR, "src", directory),
      path.join(outputDir, "src", directory),
      `runtime source directory "src/${directory}"`
    );
  }

  copyDirectory(
    path.join(ROOT_DIR, "locales"),
    path.join(outputDir, "locales"),
    'runtime source directory "locales"'
  );

  const workersSharedPath = path.join(ROOT_DIR, "workers", "shared");
  requirePath(workersSharedPath, 'runtime dependency directory "workers/shared"');
  fs.mkdirSync(path.join(outputDir, "workers"), { recursive: true });
  copyDirectory(
    workersSharedPath,
    path.join(outputDir, "workers", "shared"),
    'runtime dependency directory "workers/shared"'
  );

  const imagesSource = path.join(CONFIG.distDir, "images");
  if (
    includeImages &&
    path.resolve(imagesSource) !== path.resolve(outputDir, "images") &&
    fs.existsSync(imagesSource)
  ) {
    copyDirectory(
      imagesSource,
      path.join(outputDir, "images"),
      'generated images directory "dist/images"'
    );
  }
}

function writeSitemap(siteData, outputDir) {
  const buildDate = new Date(siteData._meta?.buildDate);
  const today = Number.isNaN(buildDate.getTime())
    ? new Date().toISOString().split("T")[0]
    : buildDate.toISOString().split("T")[0];
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
  fs.writeFileSync(path.join(outputDir, "sitemap.xml"), xml);
  console.log(
    `🗺️  Generated ${path.relative(ROOT_DIR, path.join(outputDir, "sitemap.xml"))} (${urls.length} urls)`
  );
}

function injectStaticSettings(outputDir) {
  const indexPath = path.join(outputDir, "index.html");
  requirePath(indexPath, 'packaged runtime asset "index.html"');
  let indexContent = fs.readFileSync(indexPath, "utf-8");
  const appScript = /(<script\b[^>]*\bsrc=["']src\/app\.js(?:\?[^"']*)?["'][^>]*>)/;
  if (!appScript.test(indexContent)) {
    throw new Error('Required app script reference "src/app.js" is missing from index.html');
  }

  const staticModeScript = `<script>
window.__COLORVERSE_STATIC__ = true;
window.__COLORVERSE_DATA_URL__ = './site-data.json';
window.__COLORVERSE_IMAGES_BASE__ = './images';
</script>
`;
  indexContent = indexContent.replace(appScript, `${staticModeScript}$1`);
  fs.writeFileSync(indexPath, indexContent);
}

async function packageExistingData(dataFile, outputDir, { includeImages = true } = {}) {
  requirePath(dataFile, "site data JSON");
  let siteData;
  try {
    siteData = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  } catch (error) {
    throw new Error(`Unable to read valid site data from ${dataFile}: ${error.message}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const packagedDataPath = path.join(outputDir, "site-data.json");
  if (path.resolve(dataFile) !== path.resolve(packagedDataPath)) {
    fs.copyFileSync(dataFile, packagedDataPath);
  }
  writeSitemap(siteData, outputDir);
  copyRuntimeAssets(outputDir, { includeImages });
  injectStaticSettings(outputDir);
  console.log(`📦 Packaged site data from ${dataFile} into ${outputDir}`);
}

// --- Helpers ---
function sanitizeFilename(str) {
  return str
    .replace(/[^a-z0-9_-]/gi, "_")
    .substring(0, 80)
    .toLowerCase();
}

// --- AI Text Generation ---
async function callTextAPI(prompt, model = CONFIG.model) {
  // 60s timeout: LLM JSON generation can be slow, but never let a hung
  // request stall the build indefinitely.
  const response = await fetchWithTimeout(
    CONFIG.textApiUrl,
    {
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
    },
    60000
  );

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

  // Try each model in the fallback chain; first 200 wins. Retries (429/402)
  // happen per-model before moving on.
  const models = CONFIG.imageModelFallbacks.length
    ? CONFIG.imageModelFallbacks
    : [CONFIG.imageModel];

  const MAX_RETRIES = 5;
  let lastError;

  for (const model of models) {
    const params = new URLSearchParams({
      width: String(width),
      height: String(height),
      seed: String(seed),
      nologo: "true",
      referrer: CONFIG.referrer,
      model,
      key: CONFIG.apiKey,
      enhance: "false", // don't let Pollinations rewrite style keywords
      quality: "medium",
    });
    const url = `${CONFIG.imageApiUrl}/${encodeURIComponent(coloringPrompt)}?${params}`;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(url).catch(e => {
        lastError = e;
        return null;
      });

      if (response && response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(outputPath, buffer);
        return buffer.length;
      }

      const status = response ? response.status : 502;
      const body = response ? await response.text().catch(() => "") : "";

      if (status === 429) {
        // Rate limited — respect Retry-After header or use exponential backoff
        const retryAfter =
          response.headers.get("retry-after") || response.headers.get("x-ratelimit-reset-after");
        const waitMs = retryAfter
          ? parseFloat(retryAfter) * 1000
          : Math.min(5000 * Math.pow(2, attempt - 1), 60000);
        process.stdout.write(
          `\n  ⏳ Rate limited (429). Waiting ${(waitMs / 1000).toFixed(0)}s before retry ${attempt}/${MAX_RETRIES}...`
        );
        await sleep(waitMs);
      } else if (status === 402) {
        // Balance exhausted — don't retry this model, try next in the chain.
        // The next model may be on a different tier; if all are exhausted, the
        // chain throws and the build fails fast instead of waiting 5+ min per model.
        process.stdout.write(
          `\n  💸 Balance exhausted (402) for model=${model}, trying next model... [${body.substring(0, 80)}]`
        );
        lastError = new Error(`Image API 402 for model=${model}: balance exhausted`);
        break;
      } else if (status === 400 || status === 404) {
        // Bad request / not found — don't retry this model, try next
        process.stdout.write(`\n  ✖ model=${model} returned ${status}, trying next model...`);
        lastError = new Error(`Image API ${status} for model=${model}: ${prompt.substring(0, 60)}`);
        break;
      } else {
        // Other error — short backoff, fewer retries, then move to next model
        lastError = new Error(`Image API ${status} for model=${model}: ${prompt.substring(0, 60)}`);
        if (attempt < 3) {
          await sleep(2000 * attempt);
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error(`Image API failed after trying all fallback models`);
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
  const packageOnly = args.includes("--package-only");
  const skipImages = args.includes("--skip-images");
  const textOnly = args.includes("--text-only");
  const imagesOnly = args.includes("--images-only");
  const dataFileOption = getOption(args, "--data-file");
  const outputDirOption = getOption(args, "--output-dir");
  const catLimit = args.includes("--categories")
    ? parseInt(args[args.indexOf("--categories") + 1])
    : null;
  const concurrency = args.includes("--concurrency")
    ? parseInt(args[args.indexOf("--concurrency") + 1])
    : CONFIG.concurrency;
  const delayMs = args.includes("--delay")
    ? parseInt(args[args.indexOf("--delay") + 1])
    : CONFIG.delayBetweenImages;

  if (packageOnly) {
    if (textOnly || imagesOnly || args.includes("--categories")) {
      throw new Error("--package-only cannot be combined with text/image generation options");
    }
    const dataFile = dataFileOption ? path.resolve(process.cwd(), dataFileOption) : CONFIG.dataFile;
    const outputDir = outputDirOption
      ? path.resolve(process.cwd(), outputDirOption)
      : CONFIG.distDir;
    await packageExistingData(dataFile, outputDir, { includeImages: !skipImages });
    return;
  }

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

    const categoryKeys = CATEGORY_KEYS;
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
        brand: { name: "ColorVerse", tagline: "Personalized Coloring Pages Made Just for You" },
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
        brand: { name: "ColorVerse", tagline: "Personalized Coloring Pages Made Just for You" },
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
  writeSitemap(siteData, CONFIG.distDir);

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

  // --- Step 3: Copy static assets and package runtime modules ---
  console.log("\n📁 Step 3: Copying static assets...");
  copyRuntimeAssets(CONFIG.distDir);
  injectStaticSettings(CONFIG.distDir);

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
