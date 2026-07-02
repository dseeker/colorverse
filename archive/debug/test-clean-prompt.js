#!/usr/bin/env node

/**
 * Test the new clean prompt structure
 * 15 items per category instead of 160
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://text.pollinations.ai/openai';
const API_KEY = process.env.POLLINATIONS_API_KEY;
const REFERRER_ID = 'ColorVerse-Testing';
const OUTPUT_DIR = path.join(__dirname, 'output');

const requestedModel = process.argv[2] || 'mistral';

function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

const SEASONAL_THEMES = {
  spring: {
    name: 'Spring Collection',
    description: 'Fresh blooms and new beginnings',
    prompt: 'spring flowers, baby animals, Easter, renewal, gardens',
  },
  summer: {
    name: 'Summer Collection',
    description: 'Sunny days and vacation vibes',
    prompt: 'beach, sunshine, ice cream, vacation, outdoor fun',
  },
  fall: {
    name: 'Fall Collection',
    description: 'Autumn leaves and cozy moments',
    prompt: 'autumn leaves, Halloween, Thanksgiving, cozy, harvest',
  },
  winter: {
    name: 'Winter Collection',
    description: 'Snowy scenes and holiday cheer',
    prompt: 'snowflakes, Christmas, winter sports, cozy, holidays',
  },
};

async function callAIAPI(prompt, model) {
  const payload = {
    messages: [
      {
        role: 'system',
        content: 'You are an AI assistant that generates structured JSON data based on user requirements. Output ONLY the requested JSON object.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
    model: model,
    referrer: REFERRER_ID,
  };

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error Response: ${errorText}`);
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.choices && data.choices[0] && data.choices[0].message) {
    const content = data.choices[0].message.content;
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error('\n❌ Failed to parse JSON from API response');
      console.error('Raw content (first 500 chars):', content.substring(0, 500));
      console.error('Raw content (last 500 chars):', content.substring(content.length - 500));
      console.error('Parse error:', e.message);
      throw e;
    }
  } else {
    throw new Error('Unexpected API response format');
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('🧹 CLEAN PROMPT TEST (15 items per category)');
  console.log('='.repeat(80));
  console.log();
  
  if (!API_KEY) {
    console.error('❌ ERROR: POLLINATIONS_API_KEY environment variable not set');
    process.exit(1);
  }

  const currentSeason = getCurrentSeason();
  const seasonalTheme = SEASONAL_THEMES[currentSeason];
  
  console.log(`📅 Current season: ${currentSeason}`);
  console.log(`🤖 Model: ${requestedModel}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);
  console.log();
  
  // Use the NEW clean prompt from app.js
  const prompt = `
Generate website content for 'ColorVerse', a free coloring page website.
Return ONLY valid JSON. No markdown, no explanations, just the JSON object.

STRUCTURE EXAMPLE (follow this pattern for ALL categories):
{
  "brand": {
    "name": "ColorVerse",
    "vision": "Inspiring creativity through the joy of coloring"
  },
  "seasonal_gallery": {
    "title": "${seasonalTheme.name}",
    "subtitle": "${seasonalTheme.description}",
    "description": "${seasonalTheme.description}",
    "items": {
      "seasonal_item_1": { "title": "Creative Title 1", "description": "Detailed ${currentSeason} coloring page description" },
      "seasonal_item_2": { "title": "Creative Title 2", "description": "Detailed ${currentSeason} coloring page description" },
      ... (continue to seasonal_item_12)
    }
  },
  "categories": {
    "animals": {
      "title": "Animal Kingdom",
      "description": "Discover animals from cute pets to wild creatures",
      "keywords": ["animals", "wildlife", "pets", "zoo", "creatures"],
      "items": {
        "animal_item_1": { "title": "Unique Animal Title 1", "description": "Detailed animal coloring page description" },
        "animal_item_2": { "title": "Unique Animal Title 2", "description": "Detailed animal coloring page description" },
        ... (continue pattern to animal_item_15)
      }
    },
    "nature": {
      "title": "Nature & Landscapes", 
      "description": "Beautiful scenes from forests, mountains, and gardens",
      "keywords": ["nature", "landscapes", "trees", "flowers", "outdoors"],
      "items": {
        (same pattern: nature_item_1 through nature_item_15)
      }
    }
  }
}

GENERATE ALL 25 CATEGORIES (15 items each):
1. animals - cute pets, wild creatures, zoo animals, safari, farm animals
2. fantasy - dragons, unicorns, fairies, wizards, magical creatures
3. mandalas - intricate circular patterns, geometric designs, meditation art
4. vehicles - cars, trucks, planes, boats, trains, motorcycles
5. nature - landscapes, forests, mountains, gardens, trees
6. food - treats, desserts, fruits, vegetables, culinary delights
7. space - planets, stars, rockets, astronauts, galaxies
8. abstract - artistic patterns, geometric shapes, creative designs
9. flowers - roses, tulips, bouquets, botanical illustrations
10. ocean - sea creatures, coral reefs, fish, dolphins, underwater scenes
11. dinosaurs - T-Rex, Triceratops, Stegosaurus, prehistoric creatures
12. mythical - phoenixes, griffins, mermaids, legendary beings
13. birds - eagles, hummingbirds, owls, parrots, songbirds
14. architecture - castles, houses, monuments, famous buildings
15. sports - soccer, basketball, swimming, gymnastics, athletics
16. memes - internet culture, viral content, pop culture references
17. adult_zen - intricate patterns, wine themes, coffee art, sophisticated designs
18. spicy_bold - skulls, tattoo art, rock themes, edgy designs
19. children_characters - cartoon friends, fairy tale characters, cute mascots
20. vintage_retro - 1950s style, classic cars, nostalgic designs, retro patterns
21. gaming_tech - video games, robots, pixels, futuristic technology
22. holidays - Christmas, Halloween, Easter, birthdays, celebrations
23. music_dance - instruments, dancers, musical notes, concerts
24. steampunk - Victorian style, gears, clockwork, mechanical art
25. tribal_ethnic - cultural patterns, traditional art, tribal designs

REQUIREMENTS:
- Seasonal gallery: exactly 12 items themed for ${currentSeason} (${seasonalTheme.prompt})
- Each category: exactly 15 unique, creative items
- Titles must be engaging and descriptive, NOT generic ("Item 1", "Title 2", etc.)
- Descriptions must be detailed enough for AI image generation (black & white line art)
- Mix complexity levels (simple for kids, complex for adults)
- Category keys use underscores (animal_item_1, not "animal item 1")

Return ONLY the JSON object.
`;

  console.log('📝 Generating with clean prompt...');
  console.log(`   Expected: 25 categories × 15 items = 375 items + 12 seasonal`);
  console.log(`   Prompt length: ${prompt.length} characters`);
  console.log();
  
  console.log('🚀 Calling AI API...');
  const startTime = Date.now();
  
  let result;
  try {
    result = await callAIAPI(prompt, requestedModel);
  } catch (error) {
    console.error(`\n❌ ERROR after ${((Date.now() - startTime) / 1000).toFixed(2)}s: ${error.message}`);
    throw error;
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Response received in ${duration}s`);
  console.log();
  
  // Validate
  console.log('🔍 Validating structure...');
  const categoryCount = Object.keys(result.categories || {}).length;
  const seasonalCount = Object.keys(result.seasonal_gallery?.items || {}).length;
  
  console.log(`   Categories: ${categoryCount}/25`);
  console.log(`   Seasonal items: ${seasonalCount}/12`);
  console.log();
  
  console.log('📊 Per-category item counts:');
  let totalItems = seasonalCount;
  Object.entries(result.categories || {}).forEach(([key, cat]) => {
    const itemCount = Object.keys(cat.items || {}).length;
    totalItems += itemCount;
    const status = itemCount >= 15 ? '✅' : itemCount >= 10 ? '⚠️' : '❌';
    console.log(`   ${status} ${key}: ${itemCount} items`);
  });
  console.log();
  console.log(`   Total items: ${totalItems}`);
  console.log();
  
  // Save output
  const outputFilename = `clean-prompt-${currentSeason}-${requestedModel}-${new Date().toISOString().replace(/:/g, '-')}.json`;
  const outputPath = path.join(OUTPUT_DIR, outputFilename);
  
  const output = {
    metadata: {
      timestamp: new Date().toISOString(),
      season: currentSeason,
      model: requestedModel,
      duration: parseFloat(duration),
      expectedCategories: 25,
      actualCategories: categoryCount,
      expectedItemsPerCategory: 15,
      totalItems: totalItems,
    },
    prompt: prompt,
    data: result,
  };
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`💾 Output saved to: ${outputPath}`);
  console.log();
  
  // Success criteria
  if (categoryCount >= 20 && seasonalCount === 12) {
    console.log('🎉 SUCCESS! Clean prompt generated valid structure');
  } else {
    console.log('⚠️  PARTIAL SUCCESS - some categories may be missing');
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
