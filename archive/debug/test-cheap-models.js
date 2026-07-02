#!/usr/bin/env node

import { readFileSync } from 'fs';
const models = JSON.parse(readFileSync('./debug/models.json', 'utf8'));

// Sort by completion token cost (cheapest first)
const sortedModels = models
  .filter(m => !m.is_specialized && !m.paid_only && m.pricing.completionTextTokens)
  .sort((a, b) => a.pricing.completionTextTokens - b.pricing.completionTextTokens)
  .slice(0, 10); // Top 10 cheapest

console.log('=== TOP 10 CHEAPEST MODELS (by completion token) ===\n');
sortedModels.forEach((m, i) => {
  const cost = (m.pricing.completionTextTokens * 1000000).toFixed(2);
  console.log(`${i + 1}. ${m.name.padEnd(20)} $${cost}/M tokens - ${m.description}`);
});

// Get current season
function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

// Generate full ColorVerse prompt
function generateFullPrompt() {
  const currentSeason = getCurrentSeason();
  const seasonalThemes = {
    spring: { name: "Spring Awakening", description: "Fresh blooms and new beginnings", prompt: "spring flowers, Easter, baby animals, gardens, rain, renewal" },
    summer: { name: "Summer Adventures", description: "Sunny days and outdoor fun", prompt: "beaches, pools, ice cream, camping, sunshine, vacation" },
    autumn: { name: "Autumn Harvest", description: "Cozy fall scenes and changing leaves", prompt: "Halloween, harvest, falling leaves, pumpkins, cozy, autumn colors" },
    winter: { name: "Winter Wonderland", description: "Magical winter scenes and holidays", prompt: "Christmas, snow, winter sports, hot cocoa, holidays, cozy" }
  };
  const seasonalTheme = seasonalThemes[currentSeason];

  return `Generate front page data for 'ColorVerse', a free coloring page website.
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
      "seasonal_item_3": { "title": "Unique ${currentSeason} Title 3", "description": "Detailed description for ${currentSeason} themed coloring page 3" }
    }
  },
  "categories": {
    "animals": { "title": "Animal Kingdom", "description": "Discover wonderful animals", "keywords": ["animals", "wildlife", "pets"], "items": { "sample_item": { "title": "Majestic Mountain Eagle", "description": "A detailed animal coloring page" } } }
  }
}

Focus on ${seasonalTheme.prompt} themes for seasonal items. Create unique, engaging titles that capture the magic of ${currentSeason} coloring pages.

Output ONLY the JSON object, no explanations.`;
}

// Fetch with timeout wrapper
async function fetchWithTimeout(url, options, timeout = 300000) { // 5 min timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout (5 minutes)');
    }
    throw error;
  }
}

// Exponential backoff retry function
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, 300000); // 5 min timeout
      
      // If rate limited, wait and retry
      if (response.status === 429) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 300000); // Max 5 min
        console.log(`⏳ Rate limited. Retrying in ${delay/1000}s... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      const delay = Math.min(1000 * Math.pow(2, attempt), 300000); // Max 5 min
      console.log(`⏳ Error: ${error.message}. Retrying in ${delay/1000}s... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Test each model
async function testModel(modelName, modelDesc) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${modelName} - ${modelDesc}`);
  console.log('='.repeat(80));
  
  const prompt = generateFullPrompt();
  
  try {
    const response = await fetchWithRetry('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer pk_YOUR_KEY_HERE'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are an AI assistant that generates structured JSON data based on user requirements. Output ONLY the requested JSON object.' },
          { role: 'user', content: prompt }
        ],
        model: modelName,
        response_format: { type: 'json_object' },
        temperature: 0.5
      })
    }, 3);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in response');
    }

    // Try to parse JSON
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse JSON from response');
      }
    }

    // Validate structure
    const hasValidStructure = parsed.brand && parsed.seasonal_gallery && parsed.categories;
    const seasonalItems = parsed.seasonal_gallery?.items ? Object.keys(parsed.seasonal_gallery.items).length : 0;
    
    console.log(`✅ Success!`);
    console.log(`   - Valid structure: ${hasValidStructure ? 'YES' : 'NO'}`);
    console.log(`   - Seasonal items: ${seasonalItems}`);
    console.log(`   - Categories: ${parsed.categories ? Object.keys(parsed.categories).length : 0}`);
    console.log(`   - Brand vision: ${parsed.brand?.vision?.substring(0, 80)}...`);
    
    // Show sample seasonal titles to evaluate creativity
    if (parsed.seasonal_gallery?.items) {
      console.log(`   - Sample titles:`);
      const titles = Object.values(parsed.seasonal_gallery.items).slice(0, 3);
      titles.forEach((item, i) => {
        console.log(`     ${i + 1}. "${item.title}"`);
      });
    }
    
    // Return parsed data for comparison
    return parsed;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return null;
  }
}

// Run tests sequentially
async function runTests() {
  const results = [];
  
  for (const model of sortedModels) {
    const result = await testModel(model.name, model.description);
    if (result) {
      results.push({
        name: model.name,
        cost: (model.pricing.completionTextTokens * 1000000).toFixed(2),
        data: result
      });
    }
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay between tests
  }
  
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 QUALITY vs COST COMPARISON');
  console.log('='.repeat(80));
  
  results.forEach((r, i) => {
    console.log(`\n${i + 1}. ${r.name} - $${r.cost}/M`);
    console.log(`   Vision: ${r.data.brand?.vision}`);
    console.log(`   Sample titles:`);
    const titles = Object.values(r.data.seasonal_gallery?.items || {}).slice(0, 3);
    titles.forEach((item, j) => {
      console.log(`     - "${item.title}"`);
    });
  });
  
  console.log('\n\n✅ All tests complete!');
}

runTests().catch(console.error);
