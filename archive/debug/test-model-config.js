#!/usr/bin/env node

// Quick test to verify the new model configuration
const testPrompt = "Generate a JSON object with one field: { test: 'Hello from ColorVerse' }";

async function testModel(model) {
  console.log(`\n🧪 Testing ${model}...`);
  
  try {
    const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer pk_YOUR_KEY_HERE'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: testPrompt }],
        model: model,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    
    console.log(`✅ ${model} - Working!`);
    console.log(`   Response: ${content.substring(0, 50)}...`);
    return true;
  } catch (error) {
    console.log(`❌ ${model} - Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing ColorVerse Model Configuration');
  console.log('==========================================');
  
  const models = ['qwen-coder', 'nova-fast', 'mistral'];
  
  for (const model of models) {
    await testModel(model);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ Configuration test complete!');
}

main().catch(console.error);
