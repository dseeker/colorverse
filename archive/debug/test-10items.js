#!/usr/bin/env node

/**
 * Reduced Structure Test - Testing with fewer items per category
 * 
 * Problem: The full production prompt asks for 160 items × 25 categories = 4,000 items
 * This is too large for most AI models to generate in one valid JSON response
 * 
 * This test uses a reduced version: 20 items per category = 500 total items
 * to evaluate if the prompt structure works with smaller dataset
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
  API_URL: 'https://text.pollinations.ai/openai',
  API_KEY: process.env.POLLINATIONS_API_KEY,
  DEFAULT_MODEL: 'gemini-fast', // Fast model for testing
  REFERRER_ID: 'ColorVerse-Testing',
  OUTPUT_DIR: path.join(__dirname, 'output'),
  ITEMS_PER_CATEGORY: process.env.ITEMS_PER_CATEGORY || 20, // Reduced from 160 to 20 for testing
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
// Generate Reduced Structure Prompt
// =============================================================================

function generateReducedPrompt() {
  const currentSeason = getCurrentSeason();
  const seasonalTheme = SEASONAL_THEMES[currentSeason];
  const itemCount = CONFIG.ITEMS_PER_CATEGORY;

  const prompt = `
Generate website content data for 'ColorVerse', a free coloring page website.
The output MUST be a valid JSON object adhering strictly to the following structure.
IMPORTANT: Return ONLY valid JSON. Do not use markdown formatting like \`\`\`json ... \`\`\`. Do not add any text before or after the JSON.

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
      "seasonal_item_1": { "title": "Seasonal Item Title 1", "description": "Detailed description for ${currentSeason} themed coloring page 1" },
      "seasonal_item_2": { "title": "Seasonal Item Title 2", "description": "Detailed description for ${currentSeason} themed coloring page 2" },
      // ... continue to 12 ${currentSeason}-themed items total
      // Focus on ${seasonalTheme.prompt} themes
    }
  },
  "categories": {
    "animals": {
      "title": "Adorable Animals",
      "description": "Cute and wild animals from around the world.",
      "keywords": ["animals", "pets", "wildlife", "zoo", "safari"],
      "items": {
        "animal_item_1": { "title": "Animal Item Title 1", "description": "Detailed animal coloring page description 1" },
        "animal_item_2": { "title": "Animal Item Title 2", "description": "Detailed animal coloring page description 2" },
        // ... continue to exactly ${itemCount} animal items total
        "animal_item_${itemCount}": { "title": "Animal Item Title ${itemCount}", "description": "Detailed animal coloring page description ${itemCount}" }
      }
    },
    "nature": {
      "title": "Beautiful Nature",
      "description": "Stunning landscapes, trees, and natural wonders.",
      "keywords": ["nature", "landscape", "trees", "scenery", "outdoors"],
      "items": {
        "nature_item_1": { "title": "Nature Item Title 1", "description": "Detailed nature coloring page description 1" },
        "nature_item_2": { "title": "Nature Item Title 2", "description": "Detailed nature coloring page description 2" },
        // ... continue to exactly ${itemCount} nature items total
        "nature_item_${itemCount}": { "title": "Nature Item Title ${itemCount}", "description": "Detailed nature coloring page description ${itemCount}" }
      }
    },
    "food": {
      "title": "Delicious Food & Treats",
      "description": "Tasty treats, healthy foods, and culinary delights to color.",
      "keywords": ["food", "treats", "cooking", "desserts", "cuisine"],
      "items": {
        "food_item_1": { "title": "Food Item Title 1", "description": "Detailed food coloring page description 1" },
        "food_item_2": { "title": "Food Item Title 2", "description": "Detailed food coloring page description 2" },
        // ... continue to exactly ${itemCount} food items total
        "food_item_${itemCount}": { "title": "Food Item Title ${itemCount}", "description": "Detailed food coloring page description ${itemCount}" }
      }
    },
    "space": {
      "title": "Space & Astronomy",
      "description": "Blast off to explore planets, stars, and cosmic adventures.",
      "keywords": ["space", "planets", "stars", "astronomy", "rockets"],
      "items": {
        "space_item_1": { "title": "Space Item Title 1", "description": "Detailed space coloring page description 1" },
        "space_item_2": { "title": "Space Item Title 2", "description": "Detailed space coloring page description 2" },
        // ... continue to exactly ${itemCount} space items total
        "space_item_${itemCount}": { "title": "Space Item Title ${itemCount}", "description": "Detailed space coloring page description ${itemCount}" }
      }
    },
    "abstract": {
      "title": "Abstract Art",
      "description": "Creative abstract designs and artistic patterns for imagination.",
      "keywords": ["abstract", "art", "patterns", "creative", "artistic"],
      "items": {
        "abstract_item_1": { "title": "Abstract Item Title 1", "description": "Detailed abstract coloring page description 1" },
        "abstract_item_2": { "title": "Abstract Item Title 2", "description": "Detailed abstract coloring page description 2" },
        // ... continue to exactly ${itemCount} abstract items total
        "abstract_item_${itemCount}": { "title": "Abstract Item Title ${itemCount}", "description": "Detailed abstract coloring page description ${itemCount}" }
      }
    },
    "flowers": {
      "title": "Beautiful Flowers",
      "description": "Gorgeous floral designs from simple blooms to elaborate bouquets.",
      "keywords": ["flowers", "floral", "gardens", "blooms", "botanical"],
      "items": {
        "flower_item_1": { "title": "Flower Item Title 1", "description": "Detailed flower coloring page description 1" },
        "flower_item_2": { "title": "Flower Item Title 2", "description": "Detailed flower coloring page description 2" },
        // ... continue to exactly ${itemCount} flower items total
        "flower_item_${itemCount}": { "title": "Flower Item Title ${itemCount}", "description": "Detailed flower coloring page description ${itemCount}" }
      }
    },
    "ocean": {
      "title": "Ocean & Sea Life",
      "description": "Dive into underwater worlds filled with sea creatures and coral reefs.",
      "keywords": ["ocean", "sea", "marine", "underwater", "aquatic"],
      "items": {
        "ocean_item_1": { "title": "Ocean Item Title 1", "description": "Detailed ocean coloring page description 1" },
        "ocean_item_2": { "title": "Ocean Item Title 2", "description": "Detailed ocean coloring page description 2" },
        // ... continue to exactly ${itemCount} ocean items total
        "ocean_item_${itemCount}": { "title": "Ocean Item Title ${itemCount}", "description": "Detailed ocean coloring page description ${itemCount}" }
      }
    },
    "dinosaurs": {
      "title": "Dinosaurs & Prehistoric",
      "description": "Travel back in time to the age of dinosaurs and ancient creatures.",
      "keywords": ["dinosaurs", "prehistoric", "fossils", "ancient", "reptiles"],
      "items": {
        "dinosaur_item_1": { "title": "Dinosaur Item Title 1", "description": "Detailed dinosaur coloring page description 1" },
        "dinosaur_item_2": { "title": "Dinosaur Item Title 2", "description": "Detailed dinosaur coloring page description 2" },
        // ... continue to exactly ${itemCount} dinosaur items total
        "dinosaur_item_${itemCount}": { "title": "Dinosaur Item Title ${itemCount}", "description": "Detailed dinosaur coloring page description ${itemCount}" }
      }
    }
  }
}

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${itemCount} items for each category (animal_item_1 through animal_item_${itemCount}, etc.)
2. Generate EXACTLY 12 seasonal items (seasonal_item_1 through seasonal_item_12)
3. Each title must be unique, creative, and appealing to children
4. Each description should be detailed enough to generate good images from
5. Avoid generic numbered titles like "Item 1", "Item 2" - be creative!
6. Return ONLY the JSON object, no markdown, no explanation

Focus on creating diverse, interesting content that children would love to color.
`;

  return { prompt, currentSeason, itemCount };
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
  
  // Check categories
  if (!data.categories) {
    errors.push('Missing categories');
    return errors;
  }
  
  const expectedCategories = ['animals', 'nature', 'food', 'space', 'abstract', 'flowers', 'ocean', 'dinosaurs'];
  const actualCategories = Object.keys(data.categories);
  
  for (const cat of expectedCategories) {
    if (!data.categories[cat]) {
      errors.push(`Missing category: ${cat}`);
      continue;
    }
    
    const items = data.categories[cat].items;
    if (!items) {
      errors.push(`Category ${cat} missing items`);
      continue;
    }
    
    const itemCount = Object.keys(items).length;
    if (itemCount !== expectedItemCount) {
      errors.push(`Category ${cat}: expected ${expectedItemCount} items, got ${itemCount}`);
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
  console.log('🏗️  REDUCED STRUCTURE TEST (20 items per category)');
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
  console.log('📝 Generating REDUCED prompt...');
  const { prompt, currentSeason, itemCount } = generateReducedPrompt();
  console.log(`   Expected output:`);
  console.log(`   • 8 categories (reduced from 25)`);
  console.log(`   • ${itemCount} items per category`);
  console.log(`   • ${8 * itemCount + 12} total items`);
  console.log(`   • 12 seasonal items`);
  console.log(`   Prompt length: ${prompt.length} characters`);
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
  const outputFilename = `reduced-structure-${currentSeason}-${requestedModel}-${new Date().toISOString().replace(/:/g, '-')}.json`;
  const outputPath = path.join(CONFIG.OUTPUT_DIR, outputFilename);
  
  const output = {
    metadata: {
      timestamp: new Date().toISOString(),
      season: currentSeason,
      model: requestedModel,
      duration: parseFloat(duration),
      itemsPerCategory: itemCount,
      totalCategories: 8,
      expectedTotalItems: 8 * itemCount + 12,
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
