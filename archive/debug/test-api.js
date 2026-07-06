/**
 * Quick API Test Script for zimage/nanobanana models
 * Tests if the Pollinations API responds correctly with the new models
 */

const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY || "test-key";
const BASE_URL = "https://gen.pollinations.ai/image";

// Test models
const MODELS = ["zimage", "nanobanana", "flux"];

async function testModel(model) {
  const prompt = "a simple cat coloring page, black and white line art";
  const width = 200;
  const height = 200;

  const url = `${BASE_URL}/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=${model}&referrer=dseeker.github.io`;

  console.log(`\n🧪 Testing model: ${model}`);
  console.log(`   URL: ${url.substring(0, 80)}...`);

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${POLLINATIONS_API_KEY}`,
        Referer: "https://dseeker.github.io",
      },
    });
    const duration = Date.now() - startTime;

    console.log(`   Status: ${response.status} (${response.statusText})`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Content-Type: ${response.headers.get("content-type") || "N/A"}`);

    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("image")) {
        console.log(`   ✅ SUCCESS - Image generated (${contentType})`);
        return { model, status: "success", duration };
      } else {
        console.log(`   ⚠️  WARNING - Response OK but not an image`);
        const text = await response.text();
        console.log(`   Response preview: ${text.substring(0, 200)}`);
        return { model, status: "warning", duration };
      }
    } else {
      console.log(`   ❌ FAILED - HTTP ${response.status}`);
      const text = await response.text();
      if (text) {
        console.log(`   Error preview: ${text.substring(0, 200)}`);
      }
      return { model, status: "failed", error: response.status };
    }
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}`);
    return { model, status: "error", error: error.message };
  }
}

async function testTextGeneration() {
  console.log(`\n📝 Testing Text Generation API`);

  const url = "https://gen.pollinations.ai/v1/chat/completions";
  const payload = {
    model: "openai",
    messages: [{ role: "user", content: "Say 'Hello World'" }],
    temperature: 0.5,
  };

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${POLLINATIONS_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const duration = Date.now() - startTime;

    console.log(`   Status: ${response.status}`);
    console.log(`   Duration: ${duration}ms`);

    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ SUCCESS - Text generated`);
      console.log(
        `   Content: ${result.choices?.[0]?.message?.content?.substring(0, 100) || "N/A"}`
      );
      return { status: "success", duration };
    } else {
      console.log(`   ❌ FAILED - HTTP ${response.status}`);
      return { status: "failed", error: response.status };
    }
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}`);
    return { status: "error", error: error.message };
  }
}

async function testModelDiscovery() {
  console.log(`\n🔍 Testing Model Discovery`);

  try {
    const response = await fetch("https://gen.pollinations.ai/image/models");

    if (response.ok) {
      const models = await response.json();
      console.log(`   ✅ SUCCESS - ${models.length} models available`);

      // Check if our target models exist
      const modelNames = models.map(m => m.name || m.id);
      console.log(
        `   Available models: ${modelNames.slice(0, 10).join(", ")}${modelNames.length > 10 ? "..." : ""}`
      );

      const hasZimage = modelNames.some(name => name.toLowerCase().includes("zimage"));
      const hasNanobanana = modelNames.some(name => name.toLowerCase().includes("nanobanana"));

      if (hasZimage) console.log(`   ✅ zimage model available`);
      else console.log(`   ⚠️  zimage model NOT found in available models`);

      if (hasNanobanana) console.log(`   ✅ nanobanana model available`);
      else console.log(`   ⚠️  nanobanana model NOT found in available models`);

      return { status: "success", models: modelNames };
    } else {
      console.log(`   ❌ FAILED - HTTP ${response.status}`);
      return { status: "failed" };
    }
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}`);
    return { status: "error", error: error.message };
  }
}

async function runAllTests() {
  console.log("=".repeat(60));
  console.log("🎨 COLORVERSE API TEST SUITE");
  console.log("=".repeat(60));
  console.log(`API Key: ${POLLINATIONS_API_KEY.substring(0, 10)}...`);
  console.log(`Testing at: ${new Date().toLocaleString()}`);

  const results = {
    models: [],
    text: null,
    discovery: null,
  };

  // Test model discovery first
  results.discovery = await testModelDiscovery();

  // Test each image model
  for (const model of MODELS) {
    const result = await testModel(model);
    results.models.push(result);
  }

  // Test text generation
  results.text = await testTextGeneration();

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));

  const successful = results.models.filter(r => r.status === "success").length;
  const failed = results.models.filter(r => r.status === "failed" || r.status === "error").length;

  console.log(`Image Models: ${successful}/${MODELS.length} successful`);
  console.log(`Text API: ${results.text?.status === "success" ? "✅ Working" : "❌ Failed"}`);
  console.log(
    `Model Discovery: ${results.discovery?.status === "success" ? "✅ Working" : "❌ Failed"}`
  );

  // Check if zimage is working
  const zimageResult = results.models.find(r => r.model === "zimage");
  const nanobananaResult = results.models.find(r => r.model === "nanobanana");

  console.log("\n🎯 Target Models:");
  if (zimageResult) {
    console.log(
      `   zimage: ${zimageResult.status === "success" ? "✅ Ready for production" : "❌ Not working"}`
    );
  }
  if (nanobananaResult) {
    console.log(
      `   nanobanana: ${nanobananaResult.status === "success" ? "✅ Fallback ready" : "❌ Not working"}`
    );
  }

  // Final recommendation
  console.log("\n💡 RECOMMENDATION:");
  if (zimageResult?.status === "success") {
    console.log("   ✅ zimage is working - ready to deploy!");
  } else if (nanobananaResult?.status === "success") {
    console.log("   ⚠️  zimage failed but nanobanana works - fallback will handle it");
  } else {
    console.log("   ❌ Both models failed - check API key or try again later");
  }

  console.log("=".repeat(60));

  return results;
}

// Run tests
runAllTests().catch(console.error);
