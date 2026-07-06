#!/usr/bin/env node

/**
 * Standalone JSON Structure Generator Test
 * 
 * This script makes a real API request to test the website structure generation
 * and outputs the full JSON for manual evaluation.
 * 
 * Usage:
 *   node test-json-generator.js [model]
 * 
 * Examples:
 *   node test-json-generator.js
 *   node test-json-generator.js gemini-fast
 *   node test-json-generator.js openai
 * 
 * Output will be saved to: ./output/json-structure-[timestamp].json
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Configuration
const API_KEY = process.env.POLLINATIONS_API_KEY || "";
const API_URL = "https://gen.pollinations.ai/v1/chat/completions";
const REFERRER_ID = "dseeker.github.io";
const DEFAULT_MODEL = "gemini-fast";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Get current season
function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

// Seasonal themes
const SEASONAL_THEMES = {
  spring: {
    name: "Spring Awakening",
    description: "Fresh blooms and new beginnings",
    prompt: "spring flowers, Easter, baby animals, gardens, rain, renewal",
  },
  summer: {
    name: "Summer Adventures",
    description: "Sunny days and outdoor fun",
    prompt: "beaches, pools, ice cream, camping, sunshine, vacation",
  },
  autumn: {
    name: "Autumn Harvest",
    description: "Cozy fall scenes and changing leaves",
    prompt: "Halloween, harvest, falling leaves, pumpkins, cozy, autumn colors",
  },
  winter: {
    name: "Winter Wonderland",
    description: "Magical winter scenes and holidays",
    prompt: "Christmas, snow, winter sports, hot cocoa, holidays, cozy",
  },
};

// Generate prompt
function generatePrompt() {
  const currentSeason = getCurrentSeason();
  const seasonalTheme = SEASONAL_THEMES[currentSeason];

  return `
Generate front page data for 'ColorVerse', a free coloring page website.
The output MUST be a valid JSON object with this EXACT structure:
{
  "brand": {
    "name": "ColorVerse",
    "vision": "A short, inspiring vision statement for the ColorVerse brand."
  },
  "seasonal_gallery": {
    "title": "${seasonalTheme.name}",
    "subtitle": "${seasonalTheme.description}",
    "description": "${seasonalTheme.description}",
    "items": {
      "seasonal_item_1": { "title": "Unique ${currentSeason} Title 1", "description": "Detailed description for ${currentSeason} themed coloring page 1" },
      "seasonal_item_2": { "title": "Unique ${currentSeason} Title 2", "description": "Detailed description for ${currentSeason} themed coloring page 2" },
      "seasonal_item_3": { "title": "Unique ${currentSeason} Title 3", "description": "Detailed description for ${currentSeason} themed coloring page 3" },
      "seasonal_item_4": { "title": "Unique ${currentSeason} Title 4", "description": "Detailed description for ${currentSeason} themed coloring page 4" },
      "seasonal_item_5": { "title": "Unique ${currentSeason} Title 5", "description": "Detailed description for ${currentSeason} themed coloring page 5" },
      "seasonal_item_6": { "title": "Unique ${currentSeason} Title 6", "description": "Detailed description for ${currentSeason} themed coloring page 6" },
      "seasonal_item_7": { "title": "Unique ${currentSeason} Title 7", "description": "Detailed description for ${currentSeason} themed coloring page 7" },
      "seasonal_item_8": { "title": "Unique ${currentSeason} Title 8", "description": "Detailed description for ${currentSeason} themed coloring page 8" },
      "seasonal_item_9": { "title": "Unique ${currentSeason} Title 9", "description": "Detailed description for ${currentSeason} themed coloring page 9" },
      "seasonal_item_10": { "title": "Unique ${currentSeason} Title 10", "description": "Detailed description for ${currentSeason} themed coloring page 10" },
      "seasonal_item_11": { "title": "Unique ${currentSeason} Title 11", "description": "Detailed description for ${currentSeason} themed coloring page 11" },
      "seasonal_item_12": { "title": "Unique ${currentSeason} Title 12", "description": "Detailed description for ${currentSeason} themed coloring page 12" }
    }
  },
  "categories": {
    "animals": { "title": "Animal Kingdom", "description": "Discover the wonderful world of animals from cute pets to wild creatures.", "keywords": ["animals", "wildlife", "pets", "zoo", "creatures"], "items": { "sample_item": { "title": "Majestic Mountain Eagle", "description": "A detailed animal coloring page" } } },
    "fantasy": { "title": "Fantasy & Magic", "description": "Enter magical realms filled with dragons, unicorns, and mystical adventures.", "keywords": ["fantasy", "magic", "dragons", "unicorns", "mystical"], "items": { "sample_item": { "title": "Enchanted Forest Dragon", "description": "A detailed fantasy coloring page" } } },
    "mandalas": { "title": "Mandala Meditation", "description": "Find peace and focus with intricate mandala patterns for mindful coloring.", "keywords": ["mandalas", "meditation", "patterns", "zen", "mindfulness"], "items": { "sample_item": { "title": "Cosmic Flower Mandala", "description": "A detailed mandala coloring page" } } }
  }
}

Focus on ${seasonalTheme.prompt} themes for seasonal items.
Examples: ${
    currentSeason === "spring"
      ? "cherry blossoms, Easter, baby animals, garden flowers, rain showers"
      : currentSeason === "summer"
        ? "beaches, pools, ice cream, camping, outdoor activities"
        : currentSeason === "autumn"
          ? "Halloween, harvest, falling leaves, pumpkins, cozy scenes"
          : "Christmas, snow, winter sports, hot cocoa, holiday celebrations"
  }

CRITICAL TITLE REQUIREMENTS:
- ALL seasonal item titles must be unique, creative, and evocative
- NO generic patterns like "Seasonal Item Title X" or "Sample X"
- Use descriptive adjectives + specific nouns that evoke the actual coloring page
- Each title should paint a vivid picture of what someone would color
- Make titles engaging and specific to the ${currentSeason} theme

Examples of GOOD titles for ${currentSeason}:
- "Snowflake Ballet Dancer" (winter)
- "Autumn Harvest Festival" (fall)
- "Cherry Blossom Garden" (spring)
- "Beach Sandcastle Adventure" (summer)

Examples of BAD titles (NEVER use these patterns):
- "Seasonal Item Title 1"
- "Sample ${currentSeason}"
- "Unique ${currentSeason} Title X"
- Any generic numbered pattern

Create 12 unique, engaging titles that capture the magic of ${currentSeason} coloring pages.

Output ONLY the JSON object, no explanations.`;
}

// Call AI API
async function callAIAPI(prompt, model) {
  const payload = {
    messages: [
      {
        role: "system",
        content:
          "You are an AI assistant that generates structured JSON data based on user requirements. Output ONLY the requested JSON object.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
    model: model,
    referrer: REFERRER_ID,
  };

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${API_KEY}`,
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const generatedContent = result?.choices?.[0]?.message?.content;

  if (!generatedContent) {
    throw new Error("AI response did not contain expected content structure.");
  }

  // Parse JSON
  let parsedData;
  try {
    parsedData = JSON.parse(generatedContent);
  } catch (parseError) {
    const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error(`Failed to parse JSON: ${parseError}`);
    }
  }

  return { data: parsedData, rawContent: generatedContent };
}

// Validate structure
function validateStructure(data) {
  const errors = [];

  if (!data.brand) errors.push("Missing 'brand' object");
  else {
    if (!data.brand.name) errors.push("Missing 'brand.name'");
    if (!data.brand.vision) errors.push("Missing 'brand.vision'");
  }

  if (!data.seasonal_gallery) errors.push("Missing 'seasonal_gallery' object");
  else {
    if (!data.seasonal_gallery.items) errors.push("Missing 'seasonal_gallery.items'");
    else {
      const itemCount = Object.keys(data.seasonal_gallery.items).length;
      if (itemCount !== 12) errors.push(`Expected 12 seasonal items, got ${itemCount}`);

      const genericPatterns = [
        /seasonal item title \d+/i,
        /sample \d+/i,
        /unique .* title \d+/i,
        /title \d+$/i,
      ];

      Object.entries(data.seasonal_gallery.items).forEach(([key, item]) => {
        const title = item.title?.toLowerCase() || "";
        if (genericPatterns.some(pattern => pattern.test(title))) {
          errors.push(`Generic title: "${item.title}"`);
        }
      });
    }
  }

  if (!data.categories) errors.push("Missing 'categories' object");

  return errors;
}

// Analyze quality
function analyzeQuality(data) {
  const analysis = {
    totalItems: 0,
    uniqueTitles: new Set(),
    genericTitles: [],
    shortDescriptions: [],
    avgTitleLength: 0,
    avgDescriptionLength: 0,
  };

  if (data.seasonal_gallery?.items) {
    let totalTitleLength = 0;
    let totalDescLength = 0;

    Object.entries(data.seasonal_gallery.items).forEach(([key, item]) => {
      analysis.totalItems++;
      analysis.uniqueTitles.add(item.title);

      totalTitleLength += item.title?.length || 0;
      totalDescLength += item.description?.length || 0;

      if (
        /\d+$/.test(item.title) ||
        item.title.toLowerCase().includes("title") ||
        item.title.toLowerCase().includes("sample")
      ) {
        analysis.genericTitles.push(item.title);
      }

      if (item.description && item.description.length < 30) {
        analysis.shortDescriptions.push(`${item.title}: ${item.description}`);
      }
    });

    analysis.avgTitleLength = totalTitleLength / analysis.totalItems;
    analysis.avgDescriptionLength = totalDescLength / analysis.totalItems;
  }

  return analysis;
}

// Main execution
async function main() {
  const model = process.argv[2] || DEFAULT_MODEL;

  if (!API_KEY) {
    log("\n❌ ERROR: POLLINATIONS_API_KEY environment variable not set\n", "red");
    log("Please set it with: export POLLINATIONS_API_KEY=your-key-here\n", "yellow");
    process.exit(1);
  }

  log("\n" + "=".repeat(80), "cyan");
  log("🧪 JSON STRUCTURE GENERATOR TEST", "bright");
  log("=".repeat(80) + "\n", "cyan");

  const currentSeason = getCurrentSeason();
  log(`📅 Current season: ${currentSeason}`, "blue");
  log(`🤖 Model: ${model}`, "blue");
  log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`, "blue");

  log("\n📝 Generating prompt...", "yellow");
  const prompt = generatePrompt();
  log(`   Prompt length: ${prompt.length} characters`, "blue");

  log("\n🚀 Calling AI API...", "yellow");
  const startTime = Date.now();

  try {
    const result = await callAIAPI(prompt, model);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log(`\n✅ API call successful (${duration}s)`, "green");
    log(`📏 Response size: ${JSON.stringify(result.data).length} characters`, "blue");

    // Validate
    log("\n🔍 Validating structure...", "yellow");
    const errors = validateStructure(result.data);

    if (errors.length > 0) {
      log("\n❌ VALIDATION ERRORS:", "red");
      errors.forEach(error => log(`   • ${error}`, "red"));
    } else {
      log("   ✅ All validation checks passed!", "green");
    }

    // Analyze quality
    log("\n📈 Quality Analysis:", "yellow");
    const quality = analyzeQuality(result.data);

    log(`   📝 Total items: ${quality.totalItems}`, "blue");
    log(`   🎯 Unique titles: ${quality.uniqueTitles.size}/${quality.totalItems}`, "blue");
    log(`   📏 Avg title length: ${quality.avgTitleLength.toFixed(1)} chars`, "blue");
    log(`   📄 Avg desc length: ${quality.avgDescriptionLength.toFixed(1)} chars`, "blue");

    if (quality.genericTitles.length > 0) {
      log(`\n   ⚠️  Generic titles (${quality.genericTitles.length}):`, "yellow");
      quality.genericTitles.forEach(title => log(`      • "${title}"`, "yellow"));
    } else {
      log(`   ✅ No generic titles detected`, "green");
    }

    if (quality.shortDescriptions.length > 0) {
      log(`\n   ⚠️  Short descriptions (${quality.shortDescriptions.length}):`, "yellow");
      quality.shortDescriptions.slice(0, 3).forEach(desc => log(`      • ${desc}`, "yellow"));
    }

    // Save to file
    try {
      mkdirSync(join(process.cwd(), "output"), { recursive: true });
    } catch {}

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `json-structure-${currentSeason}-${model}-${timestamp}.json`;
    const filepath = join(process.cwd(), "output", filename);

    const outputData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        model: model,
        season: currentSeason,
        durationSeconds: parseFloat(duration),
        prompt: prompt,
        validationErrors: errors,
        quality: {
          totalItems: quality.totalItems,
          uniqueTitles: quality.uniqueTitles.size,
          genericTitles: quality.genericTitles.length,
          shortDescriptions: quality.shortDescriptions.length,
          avgTitleLength: quality.avgTitleLength,
          avgDescriptionLength: quality.avgDescriptionLength,
        },
      },
      data: result.data,
      rawContent: result.rawContent,
    };

    writeFileSync(filepath, JSON.stringify(outputData, null, 2));
    log(`\n💾 Full JSON saved to: ${filepath}`, "green");

    // Sample output
    log("\n📋 Sample Items (first 3):", "yellow");
    const items = Object.entries(result.data.seasonal_gallery?.items || {}).slice(0, 3);
    items.forEach(([key, item]) => {
      log(`\n   ${key}:`, "cyan");
      log(`      Title: ${item.title}`, "blue");
      log(`      Desc: ${item.description}`, "blue");
    });

    log("\n" + "=".repeat(80), "cyan");
    log("🎉 TEST COMPLETE", "green");
    log("=".repeat(80) + "\n", "cyan");

    // Exit with appropriate code
    process.exit(errors.length > 0 || quality.genericTitles.length > 0 ? 1 : 0);
  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, "red");
    log("\n" + error.stack, "red");
    process.exit(1);
  }
}

main();
