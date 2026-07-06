function generateFullStructurePrompt() {
  const currentSeason = getCurrentSeason();
  const seasonalTheme = SEASONAL_THEMES[currentSeason];

  return `
Generate creative website content for 'ColorVerse', a free coloring page website.
Return ONLY valid JSON. No markdown, no explanations, just the JSON object.

STRUCTURE EXAMPLE (follow this pattern):
{
  "brand": {
    "name": "ColorVerse",
    "vision": "Short inspiring vision statement"
  },
  "seasonal_gallery": {
    "title": "${seasonalTheme.name}",
    "subtitle": "${seasonalTheme.description}",
    "description": "${seasonalTheme.description}",
    "items": {
      "seasonal_item_1": { "title": "Creative Title", "description": "Detailed ${currentSeason} coloring page description" },
      "seasonal_item_2": { "title": "Creative Title", "description": "Detailed ${currentSeason} coloring page description" },
      ... (continue to seasonal_item_12 with ${currentSeason} theme: ${seasonalTheme.prompt})
    }
  },
  "categories": {
    "example_category_1": {
      "title": "Category Display Name",
      "description": "Brief category description",
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "items": {
        "example_item_1": { "title": "Unique Creative Title", "description": "Detailed coloring page description" },
        "example_item_2": { "title": "Unique Creative Title", "description": "Detailed coloring page description" },
        ... (continue to example_item_15)
      }
    },
    "example_category_2": {
      (same pattern: 15 items)
    }
  }
}

INSTRUCTIONS:
Generate exactly 25 UNIQUE and DIVERSE categories with creative themes.

Category Guidelines:
- Mix traditional themes (animals, nature, space) with unexpected creative themes
- Include categories for different age groups:
  * Simple themes for young children (basic shapes, friendly characters)
  * Complex themes for adults (intricate patterns, sophisticated designs)
  * Edgy/trendy themes (memes, pop culture, gaming, tattoo art)
- Consider modern interests: gaming, technology, internet culture, music genres
- Include artistic styles: abstract, mandala, steampunk, vintage, tribal patterns
- Cover diverse subjects: fantasy creatures, vehicles, architecture, sports, food, holidays
- Be creative and unexpected! Think beyond typical coloring book themes

Category Requirements:
- Use lowercase keys with underscores (my_category_name)
- Each category needs: title, description, keywords array (5 keywords), items object
- Generate exactly 15 items per category
- Item keys follow pattern: categoryname_item_1 through categoryname_item_15

Item Requirements:
- Every title must be UNIQUE, creative, and engaging
- NO generic patterns like "Item 1", "Title 2", "Sample X"
- Descriptions must be detailed enough for AI image generation (black & white line art)
- Mix complexity levels within each category
- Focus on specific, visual concepts that are fun to color

Example Categories (be MORE creative than these):
- animals, fantasy_creatures, space_exploration, underwater_world
- mandala_meditation, geometric_patterns, abstract_art
- vintage_cars, steampunk_machines, futuristic_tech
- pop_culture_icons, gaming_legends, music_vibes
- skull_art, tattoo_designs, street_art
- zen_gardens, coffee_culture, wine_sophistication
- dinosaurs, mythical_beasts, legendary_heroes
- architecture, cityscapes, landmarks
- food_art, dessert_delights, culinary_adventures
- holidays, celebrations, cultural_festivals
- sports_action, dance_poses, yoga_flow
- nature_landscapes, forest_magic, mountain_peaks
- ocean_life, coral_reefs, sea_creatures
- birds_in_flight, wild_safari, farm_friends
- fairy_tales, cartoon_characters, anime_style
- tribal_patterns, cultural_art, world_traditions

Generate ALL 25 categories with 15 items each = 375 items total + 12 seasonal items.

Return ONLY the JSON object.
`;

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

// Validate full structure
function validateFullStructure(data) {
  const errors = [];

  if (!data.brand) errors.push("Missing 'brand' object");
  if (!data.seasonal_gallery) errors.push("Missing 'seasonal_gallery' object");
  if (!data.categories) errors.push("Missing 'categories' object");
  else {
    const categoryCount = Object.keys(data.categories).length;
    if (categoryCount !== 25) {
      errors.push(`Expected 25 categories, got ${categoryCount}`);
    }

    // Check each category has items
    Object.entries(data.categories).forEach(([key, cat]) => {
      if (!cat.items) {
        errors.push(`Category '${key}' missing items`);
      } else {
        const itemCount = Object.keys(cat.items).length;
        if (itemCount < 50) {
          errors.push(`Category '${key}' has only ${itemCount} items (expected 160)`);
        }
      }
    });
  }

  return errors;
}

// Analyze structure
function analyzeStructure(data) {
  const analysis = {
    totalCategories: 0,
    totalItems: 0,
    itemsPerCategory: {},
    avgItemsPerCategory: 0,
  };

  if (data.categories) {
    analysis.totalCategories = Object.keys(data.categories).length;

    Object.entries(data.categories).forEach(([key, cat]) => {
      const itemCount = cat.items ? Object.keys(cat.items).length : 0;
      analysis.itemsPerCategory[key] = itemCount;
      analysis.totalItems += itemCount;
    });

    analysis.avgItemsPerCategory = analysis.totalItems / analysis.totalCategories;
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
  log("🏗️  FULL WEBSITE STRUCTURE GENERATOR TEST", "bright");
  log("=".repeat(80) + "\n", "cyan");

  log("⚠️  WARNING: This generates ~4,000 items and may take 30-60 seconds", "yellow");
  log("   It will cost more API credits than the quick test.\n", "yellow");

  const currentSeason = getCurrentSeason();
  log(`📅 Current season: ${currentSeason}`, "blue");
  log(`🤖 Model: ${model}`, "blue");
  log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`, "blue");

  log("\n📝 Generating FULL PRODUCTION prompt...", "yellow");
  log("   Expected output:", "blue");
  log("   • 25 categories", "blue");
  log("   • 160 items per category", "blue");
  log("   • ~4,000 total items", "blue");
  log("   • 12 seasonal items", "blue");

  const prompt = generateFullStructurePrompt();
  log(`   Prompt length: ${prompt.length} characters\n`, "blue");

  log("🚀 Calling AI API (this may take 30-60 seconds)...", "yellow");
  const startTime = Date.now();

  try {
    const result = await callAIAPI(prompt, model);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log(`\n✅ API call successful (${duration}s)`, "green");
    log(`📏 Response size: ${JSON.stringify(result.data).length.toLocaleString()} characters`, "blue");

    // Validate
    log("\n🔍 Validating structure...", "yellow");
    const errors = validateFullStructure(result.data);

    if (errors.length > 0) {
      log("\n❌ VALIDATION ERRORS:", "red");
      errors.forEach(error => log(`   • ${error}`, "red"));
    } else {
      log("   ✅ Structure validation passed!", "green");
    }

    // Analyze
    log("\n📊 Structure Analysis:", "yellow");
    const analysis = analyzeStructure(result.data);

    log(`   📁 Total categories: ${analysis.totalCategories}`, "blue");
    log(`   📝 Total items: ${analysis.totalItems.toLocaleString()}`, "blue");
    log(`   📊 Avg items/category: ${analysis.avgItemsPerCategory.toFixed(1)}`, "blue");

    // Show items per category
    log("\n   Items per category:", "blue");
    Object.entries(analysis.itemsPerCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([key, count]) => {
        const status = count >= 160 ? "✅" : count >= 50 ? "⚠️ " : "❌";
        log(`      ${status} ${key}: ${count} items`, count >= 160 ? "green" : count >= 50 ? "yellow" : "red");
      });

    if (analysis.totalCategories > 5) {
      log(`      ... and ${analysis.totalCategories - 5} more categories`, "blue");
    }

    // Save to file
    try {
      mkdirSync(join(process.cwd(), "output"), { recursive: true });
    } catch {}

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `full-structure-${currentSeason}-${model}-${timestamp}.json`;
    const filepath = join(process.cwd(), "output", filename);

    const outputData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        model: model,
        season: currentSeason,
        durationSeconds: parseFloat(duration),
        prompt: prompt,
        validationErrors: errors,
        analysis: {
          totalCategories: analysis.totalCategories,
          totalItems: analysis.totalItems,
          avgItemsPerCategory: analysis.avgItemsPerCategory,
          itemsPerCategory: analysis.itemsPerCategory,
        },
      },
      data: result.data,
      rawContent: result.rawContent,
    };

    writeFileSync(filepath, JSON.stringify(outputData, null, 2));
    log(`\n💾 Full JSON saved to: ${filepath}`, "green");
    log(`   File size: ${(JSON.stringify(outputData).length / 1024).toFixed(0)} KB`, "blue");

    log("\n" + "=".repeat(80), "cyan");
    log("🎉 TEST COMPLETE - Review the output file for evaluation", "green");
    log("=".repeat(80) + "\n", "cyan");

    // Exit with appropriate code
    process.exit(errors.length > 0 ? 1 : 0);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n❌ ERROR after ${duration}s: ${error.message}`, "red");
    if (error.stack) {
      log("\n" + error.stack, "red");
    }
    process.exit(1);
  }
}

main();
