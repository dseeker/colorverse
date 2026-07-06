#!/usr/bin/env node

/**
 * Dynamic Categories Test - AI generates unique categories every time
 * 
 * Testing with high-capacity models to find the best one for large outputs.
 * 
 * Target: 25 categories × 40 items = 1,000 items + 12 seasonal = 1,012 items
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  API_URL: 'https://gen.pollinations.ai/v1/chat/completions',
  API_KEY: process.env.POLLINATIONS_API_KEY,
  DEFAULT_MODEL: 'mistral', // Start with mistral, then test others
  REFERRER_ID: 'ColorVerse-Testing',
  OUTPUT_DIR: path.join(__dirname, 'output'),
  ITEMS_PER_CATEGORY: 20,
  TOTAL_CATEGORIES: 25,
};

// Get model from command line or use default
const requestedModel = process.argv[2] || CONFIG.DEFAULT_MODEL;

// =============================================================================
// Season Detection
// =============================================================================

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

// =============================================================================
// Generate Dynamic Categories Prompt
// =============================================================================

function generateDynamicPrompt() {
  const currentSeason = getCurrentSeason();
  const seasonalTheme = SEASONAL_THEMES[currentSeason];
  const itemCount = CONFIG.ITEMS_PER_CATEGORY;
  const totalCategories = CONFIG.TOTAL_CATEGORIES;

  const prompt = `
Generate creative website content for 'ColorVerse', a free coloring page website.
Return ONLY valid JSON. No markdown, no explanations, just the JSON object.

STRUCTURE EXAMPLE (follow this exact pattern):
{
  "brand": {
    "name": "ColorVerse",
    "vision": "Short inspiring vision statement about creativity and coloring"
  },
  "seasonal_gallery": {
    "title": "${seasonalTheme.name}",
    "subtitle": "${seasonalTheme.description}",
    "description": "${seasonalTheme.description}",
    "items": {
      "seasonal_item_1": { "title": "Creative ${currentSeason} Title 1", "description": "Detailed ${currentSeason} coloring page description for black & white line art" },
      "seasonal_item_2": { "title": "Creative ${currentSeason} Title 2", "description": "Detailed ${currentSeason} coloring page description for black & white line art" },
      ... (continue pattern to seasonal_item_12 with ${currentSeason} theme: ${seasonalTheme.prompt})
    }
  },
  "categories": {
    "unique_category_name_1": {
      "title": "Category Display Name",
      "description": "Brief engaging category description",
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "items": {
        "categoryname_item_1": { "title": "Unique Creative Title 1", "description": "Detailed coloring page description" },
        "categoryname_item_2": { "title": "Unique Creative Title 2", "description": "Detailed coloring page description" },
        ... (continue exact pattern to categoryname_item_${itemCount})
      }
    },
    "unique_category_name_2": {
      (same structure with ${itemCount} items)
    }
    ... (continue for all ${totalCategories} categories)
  }
}

INSTRUCTIONS - Generate ${totalCategories} UNIQUE and DIVERSE Categories:

YOU MUST BE CREATIVE! Don't just use obvious categories. Mix traditional with unexpected themes:

Category Ideas (BE MORE CREATIVE than these examples):
- Traditional: animals, nature, space, ocean, dinosaurs, flowers, birds
- Fantasy: dragons, unicorns, fairies, mythical creatures, legendary heroes
- Artistic: mandalas, abstract patterns, geometric designs, zentangle art
- Modern: gaming characters, robots, technology, memes, pop culture
- Sophisticated: wine culture, coffee art, zen gardens, intricate patterns
- Edgy: skull art, tattoo designs, rock themes, street art, bold patterns
- Cultural: tribal designs, world traditions, cultural patterns, ethnic art
- Activities: sports, dance, yoga, music, instruments, performance art
- Structures: architecture, castles, monuments, steampunk machines, vehicles
- Festive: holidays, celebrations, seasonal themes, party scenes
- Food: desserts, culinary art, treats, fruits, gourmet dishes
- Retro: vintage style, 1950s themes, classic cars, nostalgic designs
- Characters: cartoon friends, fairy tale characters, cute mascots, anime style

For EACH of the ${totalCategories} categories:
- Use lowercase keys with underscores (my_awesome_category)
- Create exactly ${itemCount} items (categoryname_item_1 through categoryname_item_${itemCount})
- Make titles UNIQUE, creative, and engaging (NO "Item 1", "Title 2" patterns!)
- Descriptions must be detailed enough for AI image generation
- Mix complexity: simple for kids, intricate for adults

Category Requirements:
- title: Display name for users
- description: Brief engaging description
- keywords: Array of 5 relevant keywords
- items: Object with exactly ${itemCount} items

Item Requirements:
- Key format: categoryname_item_N (where N = 1 to ${itemCount})
- title: Unique, descriptive, evocative (paint a picture with words!)
- description: Detailed enough to generate black & white line art coloring pages

Total Expected Output:
- ${totalCategories} diverse categories
- ${itemCount} items per category = ${totalCategories * itemCount} category items
- 12 seasonal items (${currentSeason} themed: ${seasonalTheme.prompt})
- Grand total: ${totalCategories * itemCount + 12} items

Return ONLY the JSON object. No markdown code blocks, no explanations.
`;

  return { prompt, currentSeason, itemCount, totalCategories };
}

// =============================================================================
// AI API Call
// =============================================================================

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
    referrer: CONFIG.REFERRER_ID,
  };

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${CONFIG.API_KEY}`,
  };

  const response = await fetch(CONFIG.API_URL, {
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
  
  // Extract content from the response
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

// =============================================================================
// Validation
// =============================================================================

function validateStructure(data, expectedItemCount) {
  const errors = [];
  
  // Check brand
  if (!data.brand?.name || !data.brand?.vision) {
    errors.push('Missing or incomplete brand data');
  }
  
  // Check seasonal_gallery
  if (!data.seasonal_gallery?.items) {
    errors.push('Missing seasonal_gallery.items');
  } else {
    const seasonalCount = Object.keys(data.seasonal_gallery.items).length;
    if (seasonalCount !== 12) {
      errors.push(`Expected 12 seasonal items, got ${seasonalCount}`);
    }
  }
  
  // Check categories (dynamic - just validate structure)
  if (!data.categories) {
    errors.push('Missing categories');
    return errors;
  }
  
  const actualCategories = Object.keys(data.categories);
  const expectedCategoryCount = CONFIG.TOTAL_CATEGORIES;
  
  if (actualCategories.length < expectedCategoryCount - 5) {
    errors.push(`Expected ~${expectedCategoryCount} categories, got ${actualCategories.length}`);
  }
  
  // Validate each category structure
  for (const [catKey, category] of Object.entries(data.categories)) {
    if (!category.title) {
      errors.push(`Category ${catKey} missing title`);
    }
    if (!category.description) {
      errors.push(`Category ${catKey} missing description`);
    }
    if (!category.keywords || !Array.isArray(category.keywords)) {
      errors.push(`Category ${catKey} missing or invalid keywords array`);
    }
    
    const items = category.items;
    if (!items) {
      errors.push(`Category ${catKey} missing items`);
      continue;
    }
    
    const itemCount = Object.keys(items).length;
    // Allow some tolerance (±10 items)
    if (itemCount < expectedItemCount - 10 || itemCount > expectedItemCount + 10) {
      errors.push(`Category ${catKey}: expected ~${expectedItemCount} items, got ${itemCount}`);
    }
  }
  
  return errors;
}

function analyzeQuality(data) {
  const analysis = {
    totalItems: 0,
    uniqueTitles: new Set(),
    genericPatterns: 0,
    shortDescriptions: 0,
    categories: {},
  };
  
  // Analyze seasonal items
  if (data.seasonal_gallery?.items) {
    Object.values(data.seasonal_gallery.items).forEach(item => {
      analysis.totalItems++;
      analysis.uniqueTitles.add(item.title);
      
      if (/^(Seasonal Item|Item|Title)\s*\d+/.test(item.title)) {
        analysis.genericPatterns++;
      }
      if (item.description && item.description.length < 30) {
        analysis.shortDescriptions++;
      }
    });
  }
  
  // Analyze categories
  if (data.categories) {
    Object.entries(data.categories).forEach(([catName, category]) => {
      const catAnalysis = {
        itemCount: 0,
        uniqueTitles: new Set(),
        genericPatterns: 0,
        shortDescriptions: 0,
      };
      
      if (category.items) {
        Object.values(category.items).forEach(item => {
          analysis.totalItems++;
          catAnalysis.itemCount++;
          
          analysis.uniqueTitles.add(item.title);
          catAnalysis.uniqueTitles.add(item.title);
          
          if (/^(Item|Title)\s*\d+/.test(item.title)) {
            analysis.genericPatterns++;
            catAnalysis.genericPatterns++;
          }
          if (item.description && item.description.length < 30) {
            analysis.shortDescriptions++;
            catAnalysis.shortDescriptions++;
          }
        });
      }
      
      analysis.categories[catName] = catAnalysis;
    });
  }
  
  return analysis;
}

// =============================================================================
// Main Execution
// =============================================================================

async function main() {
  console.log('='.repeat(80));
  console.log('🎨 MODEL COMPARISON TEST (40 items/category, testing high-capacity models)');
  console.log('='.repeat(80));
  console.log();
  console.log(`📅 Current season: ${getCurrentSeason()}`);
  console.log(`🤖 Model: ${requestedModel}`);
  console.log(`🔑 API Key: ${CONFIG.API_KEY ? CONFIG.API_KEY.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log();
  
  if (!CONFIG.API_KEY) {
    console.error('❌ ERROR: POLLINATIONS_API_KEY environment variable not set');
    console.error('   Set it with: export POLLINATIONS_API_KEY=your_key_here');
    process.exit(1);
  }
  
  // Generate prompt
  console.log('📝 Generating DYNAMIC prompt (AI creates unique categories)...');
  const { prompt, currentSeason, itemCount, totalCategories } = generateDynamicPrompt();
  console.log(`   Expected output:`);
  console.log(`   • ${totalCategories} AI-generated unique categories`);
  console.log(`   • ${itemCount} items per category`);
  console.log(`   • ${totalCategories * itemCount + 12} total items`);
  console.log(`   • 12 seasonal items`);
  console.log(`   Prompt length: ${prompt.length} characters`);
  console.log();
  console.log('⚠️  NOTE: This may take 60-90 seconds due to large output size');
  console.log();
  
  // Call API
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
  const errors = validateStructure(result, itemCount);
  
  if (errors.length > 0) {
    console.error('❌ Validation errors:');
    errors.forEach(err => console.error(`   - ${err}`));
  } else {
    console.log('✅ Structure validation passed');
  }
  console.log();
  
  // Quality analysis
  console.log('📊 Quality Analysis:');
  const quality = analyzeQuality(result);
  console.log(`   Total items generated: ${quality.totalItems}`);
  console.log(`   Unique titles: ${quality.uniqueTitles.size} (${quality.totalItems - quality.uniqueTitles.size} duplicates)`);
  console.log(`   Generic patterns detected: ${quality.genericPatterns}`);
  console.log(`   Short descriptions (<30 chars): ${quality.shortDescriptions}`);
  console.log();
  
  console.log('   Per-category breakdown:');
  Object.entries(quality.categories).forEach(([name, cat]) => {
    console.log(`   • ${name}: ${cat.itemCount} items, ${cat.uniqueTitles.size} unique, ${cat.genericPatterns} generic`);
  });
  console.log();
  
  // Save output
  const outputFilename = `dynamic-categories-${currentSeason}-${requestedModel}-${new Date().toISOString().replace(/:/g, '-')}.json`;
  const outputPath = path.join(CONFIG.OUTPUT_DIR, outputFilename);
  
  const output = {
    metadata: {
      timestamp: new Date().toISOString(),
      season: currentSeason,
      model: requestedModel,
      duration: parseFloat(duration),
      itemsPerCategory: itemCount,
      totalCategories: totalCategories,
      expectedTotalItems: totalCategories * itemCount + 12,
      validationErrors: errors,
      quality: {
        totalItems: quality.totalItems,
        uniqueTitles: quality.uniqueTitles.size,
        genericPatterns: quality.genericPatterns,
        shortDescriptions: quality.shortDescriptions,
      },
    },
    prompt: prompt,
    data: result,
  };
  
  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`💾 Output saved to: ${outputPath}`);
  console.log();
  
  // Summary
  if (errors.length === 0 && quality.genericPatterns === 0) {
    console.log('🎉 SUCCESS! Structure is valid and high quality');
  } else if (errors.length === 0) {
    console.log('⚠️  SUCCESS with quality concerns (generic patterns detected)');
  } else {
    console.log('❌ FAILED validation');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
