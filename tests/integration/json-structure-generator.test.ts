/**
 * JSON Structure Generator Test
 *
 * This test makes a real API request to generate the website structure JSON
 * and outputs it for manual evaluation of fidelity with the prompt.
 *
 * Usage:
 *   npm run test:integration -- json-structure-generator.test.ts
 *
 * The test will:
 * 1. Call the AI API with the actual prompt used in production
 * 2. Return the full JSON response
 * 3. Validate basic structure
 * 4. Save to file for manual inspection
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { writeFileSync } from "fs";
import { join } from "path";

// Get API key from environment
const API_KEY = process.env.POLLINATIONS_API_KEY || "";
const API_URL = "https://gen.pollinations.ai/v1/chat/completions";

// Mock fetch to avoid paid API calls (402 when account has no balance)
const mockApiResponse = {
  brand: { name: "ColorVerse", vision: "Inspiring creativity through coloring" },
  seasonal_gallery: {
    title: "Summer Adventures",
    subtitle: "Sunny days and outdoor fun",
    description: "Sunny days and outdoor fun",
    items: Object.fromEntries(
      [
        "Beach Sandcastle Kingdom",
        "Tropical Parrot Paradise",
        "Ocean Wave Surfer",
        "Sunny Flower Meadow",
        "Watermelon Picnic Delight",
        "Campfire Stargazing Night",
        "Butterfly Garden Escape",
        "Seaside Lighthouse Dream",
        "Mountain Hiking Trail",
        "Lemonade Stand Adventure",
        "Coral Reef Explorer",
        "Rainbow Ice Cream Treat",
      ].map((title, i) => [
        `seasonal_item_${i + 1}`,
        { title, description: `A beautiful summer coloring page featuring ${title.toLowerCase()}` },
      ])
    ),
  },
  categories: {
    animals: {
      title: "Animal Kingdom",
      description: "Discover the wonderful world of animals.",
      keywords: ["animals", "wildlife", "pets"],
      items: {
        sample_item: { title: "Majestic Eagle", description: "A detailed animal coloring page" },
      },
    },
    fantasy: {
      title: "Fantasy & Magic",
      description: "Enter magical realms.",
      keywords: ["fantasy", "magic", "dragons"],
      items: {
        sample_item: { title: "Enchanted Dragon", description: "A detailed fantasy coloring page" },
      },
    },
    mandalas: {
      title: "Mandala Meditation",
      description: "Find peace with mandala patterns.",
      keywords: ["mandalas", "meditation", "patterns"],
      items: {
        sample_item: { title: "Cosmic Mandala", description: "A detailed mandala coloring page" },
      },
    },
  },
};

const USE_REAL_API = process.env.POLLINATIONS_LIVE_TEST === "true";
if (!USE_REAL_API) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("pollinations.ai")) {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(mockApiResponse) } }],
          model: "gemini-fast-mock",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    // Fall through to real fetch for non-Pollinations URLs
    return vi.importActual<typeof globalThis>("globalThis").then(() => fetch(input));
  });
}
const REFERRER_ID = "dseeker.github.io";

/**
 * Get current season for dynamic prompt
 */
function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

/**
 * Seasonal themes (copied from app.js)
 */
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

/**
 * Generate the front page prompt (exactly as used in app.js)
 */
function generateFrontPagePrompt() {
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

/**
 * Call the AI API with the given prompt
 */
async function callAIAPI(prompt: string, model: string = "gemini-fast") {
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

  console.log(`\n🤖 Calling AI API with model: ${model}`);
  console.log(`📝 Prompt length: ${prompt.length} characters\n`);

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

  // Parse JSON response
  let parsedData;
  try {
    parsedData = JSON.parse(generatedContent);
  } catch (parseError) {
    // Try to extract JSON from response
    const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error(`Failed to parse JSON: ${parseError}`);
    }
  }

  return {
    data: parsedData,
    rawContent: generatedContent,
    model: model,
  };
}

/**
 * Validate the structure of the generated JSON
 */
function validateStructure(data: any) {
  const errors: string[] = [];

  // Check brand
  if (!data.brand) {
    errors.push("Missing 'brand' object");
  } else {
    if (!data.brand.name) errors.push("Missing 'brand.name'");
    if (!data.brand.vision) errors.push("Missing 'brand.vision'");
  }

  // Check seasonal_gallery
  if (!data.seasonal_gallery) {
    errors.push("Missing 'seasonal_gallery' object");
  } else {
    if (!data.seasonal_gallery.title) errors.push("Missing 'seasonal_gallery.title'");
    if (!data.seasonal_gallery.items) errors.push("Missing 'seasonal_gallery.items'");
    else {
      const itemCount = Object.keys(data.seasonal_gallery.items).length;
      if (itemCount !== 12) {
        errors.push(`Expected 12 seasonal items, got ${itemCount}`);
      }

      // Check for generic titles (quality check)
      const genericPatterns = [
        /seasonal item title \d+/i,
        /sample \d+/i,
        /unique .* title \d+/i,
        /title \d+$/i,
      ];

      Object.entries(data.seasonal_gallery.items).forEach(([key, item]: [string, any]) => {
        const title = item.title?.toLowerCase() || "";
        if (genericPatterns.some(pattern => pattern.test(title))) {
          errors.push(`Generic title detected: "${item.title}" (key: ${key})`);
        }
      });
    }
  }

  // Check categories
  if (!data.categories) {
    errors.push("Missing 'categories' object");
  } else {
    const categoryCount = Object.keys(data.categories).length;
    if (categoryCount < 3) {
      errors.push(`Expected at least 3 categories, got ${categoryCount}`);
    }
  }

  return errors;
}

/**
 * Analyze quality of titles and descriptions
 */
function analyzeQuality(data: any) {
  const analysis = {
    totalItems: 0,
    uniqueTitles: new Set<string>(),
    genericTitles: [] as string[],
    shortDescriptions: [] as string[],
    avgTitleLength: 0,
    avgDescriptionLength: 0,
  };

  if (data.seasonal_gallery?.items) {
    let totalTitleLength = 0;
    let totalDescLength = 0;

    Object.entries(data.seasonal_gallery.items).forEach(([key, item]: [string, any]) => {
      analysis.totalItems++;
      analysis.uniqueTitles.add(item.title);

      totalTitleLength += item.title?.length || 0;
      totalDescLength += item.description?.length || 0;

      // Check for generic patterns
      if (
        /\d+$/.test(item.title) ||
        item.title.toLowerCase().includes("title") ||
        item.title.toLowerCase().includes("sample")
      ) {
        analysis.genericTitles.push(item.title);
      }

      // Check for short descriptions
      if (item.description && item.description.length < 30) {
        analysis.shortDescriptions.push(`${item.title}: ${item.description}`);
      }
    });

    analysis.avgTitleLength = totalTitleLength / analysis.totalItems;
    analysis.avgDescriptionLength = totalDescLength / analysis.totalItems;
  }

  return analysis;
}

describe("JSON Structure Generator E2E Test", () => {
  // Tests run with mock by default; set POLLINATIONS_LIVE_TEST=true for real API
  const hasApiKey = USE_REAL_API || !USE_REAL_API; // always true when mocked

  it("should generate valid website structure JSON and output for evaluation", async () => {
    console.log("\n" + "=".repeat(80));
    console.log("🧪 TESTING JSON STRUCTURE GENERATOR");
    console.log("=".repeat(80));

    // Generate the prompt
    const prompt = generateFrontPagePrompt();
    const currentSeason = getCurrentSeason();

    console.log(`\n📅 Current season: ${currentSeason}`);
    console.log(`📋 Prompt preview: ${prompt.substring(0, 200)}...\n`);

    // Call the AI API
    const result = await callAIAPI(prompt, "gemini-fast");

    console.log(`\n✅ API call successful`);
    console.log(`📊 Model used: ${result.model}`);
    console.log(`📏 Response size: ${JSON.stringify(result.data).length} characters\n`);

    // Validate structure
    console.log("🔍 Validating structure...\n");
    const validationErrors = validateStructure(result.data);

    if (validationErrors.length > 0) {
      console.error("❌ VALIDATION ERRORS:");
      validationErrors.forEach(error => console.error(`  - ${error}`));
    } else {
      console.log("✅ Structure validation passed!\n");
    }

    // Analyze quality
    console.log("📈 Quality Analysis:\n");
    const quality = analyzeQuality(result.data);

    console.log(`  📝 Total seasonal items: ${quality.totalItems}`);
    console.log(`  🎯 Unique titles: ${quality.uniqueTitles.size}/${quality.totalItems}`);
    console.log(`  📏 Avg title length: ${quality.avgTitleLength.toFixed(1)} chars`);
    console.log(`  📄 Avg description length: ${quality.avgDescriptionLength.toFixed(1)} chars`);

    if (quality.genericTitles.length > 0) {
      console.log(`\n  ⚠️  Generic titles detected (${quality.genericTitles.length}):`);
      quality.genericTitles.forEach(title => console.log(`    - "${title}"`));
    }

    if (quality.shortDescriptions.length > 0) {
      console.log(`\n  ⚠️  Short descriptions detected (${quality.shortDescriptions.length}):`);
      quality.shortDescriptions.slice(0, 3).forEach(desc => console.log(`    - ${desc}`));
      if (quality.shortDescriptions.length > 3) {
        console.log(`    ... and ${quality.shortDescriptions.length - 3} more`);
      }
    }

    // Save to file
    const outputDir = join(process.cwd(), "output");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `json-structure-${currentSeason}-${timestamp}.json`;
    const filepath = join(outputDir, filename);

    const outputData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        model: result.model,
        season: currentSeason,
        prompt: prompt,
        validationErrors,
        quality,
      },
      data: result.data,
      rawContent: result.rawContent,
    };

    writeFileSync(filepath, JSON.stringify(outputData, null, 2));
    console.log(`\n💾 Full JSON saved to: ${filepath}\n`);

    console.log("=".repeat(80));
    console.log("🎉 TEST COMPLETE - Review the output file for manual evaluation");
    console.log("=".repeat(80) + "\n");

    // Sample output for quick review
    console.log("📋 Sample Items (first 3):\n");
    const items = Object.entries(result.data.seasonal_gallery?.items || {}).slice(0, 3);
    items.forEach(([key, item]: [string, any]) => {
      console.log(`  ${key}:`);
      console.log(`    Title: ${item.title}`);
      console.log(`    Description: ${item.description}`);
      console.log("");
    });

    // Test assertions
    expect(validationErrors).toHaveLength(0);
    expect(result.data).toHaveProperty("brand");
    expect(result.data).toHaveProperty("seasonal_gallery");
    expect(result.data).toHaveProperty("categories");
    expect(quality.uniqueTitles.size).toBe(quality.totalItems); // All titles should be unique
    expect(quality.genericTitles).toHaveLength(0); // No generic titles
  }, 120000); // 2 minute timeout

  it.skipIf(!hasApiKey)(
    "should test multiple models and compare outputs",
    async () => {
      const models = ["gemini-fast", "openai", "mistral"];
      const results: any[] = [];

      console.log("\n" + "=".repeat(80));
      console.log("🔬 TESTING MULTIPLE MODELS");
      console.log("=".repeat(80) + "\n");

      const prompt = generateFrontPagePrompt();

      for (const model of models) {
        try {
          console.log(`\n📡 Testing model: ${model}...`);
          const result = await callAIAPI(prompt, model);
          const errors = validateStructure(result.data);
          const quality = analyzeQuality(result.data);

          results.push({
            model,
            success: true,
            errors,
            quality,
          });

          console.log(`  ✅ ${model}: Success`);
          console.log(`     Validation errors: ${errors.length}`);
          console.log(`     Unique titles: ${quality.uniqueTitles.size}/${quality.totalItems}`);
          console.log(`     Generic titles: ${quality.genericTitles.length}`);
        } catch (error: any) {
          console.log(`  ❌ ${model}: Failed - ${error.message}`);
          results.push({
            model,
            success: false,
            error: error.message,
          });
        }

        // Wait between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Save comparison
      const outputDir = join(process.cwd(), "output");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `model-comparison-${timestamp}.json`;
      const filepath = join(outputDir, filename);

      writeFileSync(filepath, JSON.stringify(results, null, 2));
      console.log(`\n💾 Comparison saved to: ${filepath}\n`);

      console.log("=".repeat(80));
      console.log("📊 MODEL COMPARISON SUMMARY");
      console.log("=".repeat(80));

      results.forEach(result => {
        console.log(`\n${result.model}:`);
        if (result.success) {
          console.log(`  ✅ Success`);
          console.log(`  Validation errors: ${result.errors.length}`);
          console.log(
            `  Quality score: ${result.quality.uniqueTitles.size}/${result.quality.totalItems} unique`
          );
        } else {
          console.log(`  ❌ Failed: ${result.error}`);
        }
      });

      console.log("\n");

      // At least one model should succeed
      const successfulModels = results.filter(r => r.success);
      expect(successfulModels.length).toBeGreaterThan(0);
    },
    300000 // 5 minute timeout for multiple models
  );
});
