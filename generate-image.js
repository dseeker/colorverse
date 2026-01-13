/**
 * ColorVerse AI Image Generator
 *
 * Advanced AI-powered image generation script using the Pollinations API with intelligent
 * prompt variation generation, professional metadata embedding, and Adobe Lightroom compatibility.
 * Designed for high-quality creative workflows with rich flavor/theme metadata support.
 *
 * ✨ KEY FEATURES:
 * - 🎨 AI-Powered Prompt Variations: Uses Pollinations text API to generate diverse, creative prompts with structured metadata
 * - 📸 Adobe Lightroom Compatible: Embeds metadata in industry-standard fields (Title, Caption, Keywords) for professional workflows
 * - 🏷️ Rich Flavor Metadata: Automatic flavor name, description, and ingredient extraction from AI-generated variations
 * - 🔄 Intelligent JSON Parsing: Robust handling of text API responses with fallback strategies
 * - 📁 Professional Output: Timestamped files with embedded EXIF, IPTC, and XMP metadata
 * - 🛠️ Multiple Generation Modes: Single prompts, file-based batches, or AI-generated variations
 * - ⚙️ Full API Support: Complete Pollinations API parameter coverage with retry logic and timeout management
 *
 * 🔧 CORE OPERATIONS:
 * - 🎯 AI Variation Generation: Creates diverse prompt variations with flavor/theme metadata using Pollinations text API
 * - 🖼️ Image Generation: High-quality image creation with professional enhancement filters
 * - 📊 Metadata Embedding: Adobe Lightroom-compatible metadata in Title, Caption, and Keywords fields
 * - 🧪 Metadata Testing: Comprehensive verification of embedded EXIF, IPTC, and XMP data
 * - 🧹 File Cleanup: Automatic removal of temporary backup files created during metadata writing
 *
 * 📈 LIGHTROOM INTEGRATION:
 * - Title Field: Flavor/theme names (e.g., "Chanel No. 5 Velvet Vanilla")
 * - Caption Field: Rich descriptions (e.g., "Silky vanilla gelato with jasmine and bergamot...")
 * - Keywords Field: Searchable ingredients (e.g., "vanilla bean, jasmine, bergamot, almond praline")
 * - Professional workflow compatibility with industry-standard metadata fields
 *
 * 🚀 USAGE:
 *   # 🎨 AI-Powered Generation with Variations (default mode)
 *   node generate-image.js "<theme-prompt>" [--count=<number>] [--model=<model>] [--orientation=<portrait|landscape|square>]
 *   npm run generate "<theme-prompt>" [--count=<number>] [--model=<model>] [--orientation=<portrait|landscape|square>]
 *
 *   # 🔁 Simple Generation (no variations)
 *   node generate-image.js "<prompt>" --variations=false [--count=<number>]
 *
 *   # 📁 File-based Generation with Template
 *   node generate-image.js "<template-with-{}>" --inputFile=<path-to-prompts.txt>
 *
 *   # 🧪 Metadata Testing (displays Lightroom-compatible fields)
 *   node generate-image.js --test [--testFile=<path-to-image.jpg>]
 *   npm run test:metadata
 *
 *   # 🧹 Cleanup (removes ExifTool temporary files)
 *   node generate-image.js --cleanup
 *   npm run cleanup
 *
 * 🌟 EXAMPLES:
 *   # 🎨 Generate high-fashion gelato flavors with AI variations and rich metadata
 *   node generate-image.js "luxury gelatos inspired by haute couture fashion brands" --count=5 --orientation=square
 *   # → Creates 5 unique gelato concepts with flavor names, descriptions, and ingredients
 *   # → Lightroom will show: Title="Chanel No.5 Velvet Vanilla", Caption="Silky vanilla with jasmine...", Keywords="vanilla,jasmine,bergamot"
 *
 *   # ☕ Generate artisanal coffee variations for Instagram
 *   npm run generate "artisanal coffee collection for social media" --count=3 --model=flux
 *   # → AI creates diverse coffee-themed prompts with detailed flavor profiles
 *
 *   # 🍷 Batch generate wine-inspired desserts from file
 *   node generate-image.js "gourmet {} dessert for fine dining" --inputFile=wine-varieties.txt
 *   # → Reads wine-varieties.txt and creates dessert for each wine type
 *
 *   # 🎯 Generate identical images (no AI variations)
 *   node generate-image.js "minimalist vanilla bean gelato" --count=3 --variations=false
 *   # → Creates 3 identical images with different random seeds
 *
 *   # 🖼️ Image-to-image enhancement with kontext model
 *   node generate-image.js "enhance this dessert photo" --model=kontext --image="https://example.com/dessert.jpg"
 *
 *   # 📊 Test Lightroom-compatible metadata in generated images
 *   npm run test:metadata
 *   # → Shows Title, Caption, and Keywords fields that appear in Lightroom
 *
 *   # 🧹 Clean up ExifTool temporary files
 *   npm run cleanup
 *
 * Available Models: flux, kontext, turbo, nanobanana, seedream (default: flux)
 * - Image parameter supported only for: kontext, nanobanana, seedream
 *
 * Output Structure:
 * - Images: output/{timestamp}-{prompt-slug}.jpg (with embedded metadata)
 *
 * 🏗️ ARCHITECTURE FLOW:
 * ======================
 * 1. 📋 parseArguments() → Parse CLI arguments, validate input, set defaults
 * 2. 🚀 main() → Entry point with three execution paths:
 *    • 🧪 test mode: testImageMetadata() → Verify embedded metadata with enhanced Lightroom field display
 *    • 🧹 cleanup mode: cleanupTemporaryFiles() → Remove temporary ExifTool backup files
 *    • 🎨 generation mode: Continue to intelligent prompt processing (step 3)
 *
 * 3. 🧠 INTELLIGENT PROMPT PROCESSING (3 strategies):
 *    a) 📁 inputFile: Read prompts from file → Template substitution with "{}" placeholder
 *    b) 🎯 useVariations=true (default): generateVariations() → AI-powered prompt generation:
 *       • Call Pollinations text API with structured JSON request
 *       • Parse response into {prompt, metadata: {flavor, description, ingredients}}
 *       • Robust error handling with fallback to original prompt
 *    c) 🔁 useVariations=false: Create identical prompt array for consistent generation
 *
 * 4. 🔄 processMultiplePrompts() → Iterate through variations with metadata
 * 5. 🖼️ For each variation: processSinglePrompt() → Generate professional image:
 *    • generateImage() → Pollinations image API call with exponential backoff retry
 *    • saveImageAndPrompt() → Sharp image processing and file optimization
 *    • addImageMetadata() → Adobe Lightroom-compatible metadata embedding:
 *      - Title: Flavor/theme name
 *      - Caption-Abstract: Rich description
 *      - Keywords: Searchable ingredients/tags
 * 6. ⏱️ Rate limiting: 3-second delays between generations for API stability
 *
 * 📸 ADOBE LIGHTROOM METADATA INTEGRATION:
 * ========================================
 * This script embeds metadata in industry-standard fields that Adobe Lightroom recognizes and displays:
 *
 * 🏷️ METADATA FIELD MAPPING:
 * • EXIF:Title + IPTC:ObjectName → Lightroom "Title" field
 *   - Contains: Flavor/theme name (e.g., "Chanel No. 5 Velvet Vanilla")
 *   - Visibility: Highly visible in Lightroom's metadata panel and grid view
 *   - Usage: Perfect for quick identification and sorting
 *
 * • IPTC:Caption-Abstract + EXIF:UserComment → Lightroom "Caption" field
 *   - Contains: Rich flavor/theme description
 *   - Visibility: Large text area in Lightroom's metadata panel
 *   - Usage: Detailed descriptions for professional catalogs
 *
 * • IPTC:Keywords → Lightroom "Keywords" field
 *   - Contains: Comma-separated ingredients/tags
 *   - Visibility: Searchable and filterable in Lightroom
 *   - Usage: Advanced filtering, smart collections, keyword hierarchies
 *
 * 📊 LIGHTROOM WORKFLOW BENEFITS:
 * • 🔍 Smart Collections: Auto-group images by ingredients (e.g., all "vanilla" flavors)
 * • 📱 Quick Filtering: Filter by flavor names in the metadata panel
 * • 🏢 Professional Catalogs: Rich descriptions for commercial photography workflows
 * • 📈 Batch Operations: Apply metadata templates to similar flavor categories
 * • 🌐 Export Consistency: Metadata preserved across all export formats
 *
 * 🔧 TECHNICAL IMPLEMENTATION:
 * • Uses ExifTool for cross-platform metadata writing
 * • Writes to EXIF, IPTC, and XMP simultaneously for maximum compatibility
 * • Industry-standard field mapping based on Adobe Lightroom field preferences
 * • Automatic cleanup of temporary files created during metadata writing
 *
 * Notes:
 * - Images are processed with Sharp for optimization
 * - Metadata uses ExifTool for embedding (removes temporary backups on cleanup)
 * - Script follows single responsibility principle with modular functions
 * - Easily extensible for additional operations (e.g., new APIs, batch processing)
 * - API timeout increased to 60s for complex generations
 */

require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { ExifTool } = require("exiftool-vendored");

const availableModels = ["flux", "kontext", "turbo", "nanobanana", "seedream"];

const ORIENTATIONS = {
  portrait: { width: 720, height: 1280 },
  landscape: { width: 1280, height: 720 },
  square: { width: 1024, height: 1024 },
};

const QUALITY_ENHANCER =
  ", ultra realistic, photorealistic, captured with professional camera, high resolution, detailed textures, natural lighting, sharp focus, 8k";

let exifTool = null;

const parseArguments = () => {
  const args = process.argv.slice(2);
  const prompt = args.find(arg => !arg.startsWith("--"));
  const modelArg = args.find(arg => arg.startsWith("--model="));
  const countArg = args.find(arg => arg.startsWith("--count="));
  const inputFileArg = args.find(arg => arg.startsWith("--inputFile="));
  const variationsArg = args.find(arg => arg.startsWith("--variations="));
  const widthArg = args.find(arg => arg.startsWith("--width="));
  const heightArg = args.find(arg => arg.startsWith("--height="));
  const imageArg = args.find(arg => arg.startsWith("--image="));
  const nologoArg = args.find(arg => arg.startsWith("--nologo="));
  const privateArg = args.find(arg => arg.startsWith("--private="));
  const enhanceArg = args.find(arg => arg.startsWith("--enhance="));
  const safeArg = args.find(arg => arg.startsWith("--safe="));
  const referrerArg = args.find(arg => arg.startsWith("--referrer="));
  const tokenArg = args.find(arg => arg.startsWith("--token="));
  const testArg = args.find(arg => arg === "--test");
  const cleanupArg = args.find(arg => arg === "--cleanup");
  const testFileArg = args.find(arg => arg.startsWith("--testFile="));
  const orientationArg = args.find(arg => arg.startsWith("--orientation="));

  const model = modelArg ? modelArg.split("=")[1] : "flux";
  const count = countArg ? parseInt(countArg.split("=")[1], 10) : 1;
  const inputFile = inputFileArg ? inputFileArg.split("=")[1] : null;
  const width = widthArg ? parseInt(widthArg.split("=")[1], 10) : null;
  const height = heightArg ? parseInt(heightArg.split("=")[1], 10) : null;
  const useVariations = variationsArg ? variationsArg.split("=")[1] === "true" : true;
  const image = imageArg ? imageArg.split("=")[1] : null;
  const nologo = nologoArg ? nologoArg.split("=")[1] === "true" : true;
  const privateMode = privateArg ? privateArg.split("=")[1] === "true" : false;
  const enhance = enhanceArg ? enhanceArg.split("=")[1] === "true" : false;
  const safe = safeArg ? safeArg.split("=")[1] === "true" : false;
  const referrer = referrerArg ? referrerArg.split("=")[1] : null;
  const token = tokenArg ? tokenArg.split("=")[1] : process.env.POLLINATIONS_API_KEY || null;
  const test = testArg !== undefined;
  const cleanup = cleanupArg !== undefined;
  const testFile = testFileArg ? testFileArg.split("=")[1] : null;

  const orientation = orientationArg ? orientationArg.split("=")[1] : null;

  if (cleanup && (prompt || inputFile || test)) {
    console.error("Error: Cleanup mode cannot be combined with other arguments.");
    console.log("Usage: node generate-image.js --cleanup");
    process.exit(1);
  }

  if (!test && !cleanup && !prompt) {
    console.error("Error: Prompt is a required argument.");
    console.log(
      'Usage: node generate-image.js "<prompt>" [--model=<model>] [--count=<number>] [--inputFile=<path>] [--width=<number>] [--height=<number>] [--image=<url>] [--nologo] [--private] [--enhance] [--safe] [--referrer=<id>] [--orientation=<portrait|landscape|square>] [--variations=<true|false>] [--test] [--cleanup]'
    );
    process.exit(1);
  }

  if (test && prompt) {
    console.error("Error: Test mode cannot be combined with generation arguments.");
    console.log("Usage for testing: node generate-image.js --test [--testFile=<path>]");
    process.exit(1);
  }

  if (image && !["kontext", "nanobanana", "seedream"].includes(model)) {
    console.error(
      "Error: --image parameter is only supported with kontext, nanobanana, or seedream models."
    );
    process.exit(1);
  }

  if (model !== "default" && !availableModels.includes(model)) {
    console.error(`Error: Invalid model. Available models are: ${availableModels.join(", ")}`);
    process.exit(1);
  }

  return {
    prompt,
    model,
    count,
    inputFile,
    width,
    height,
    image,
    nologo,
    private: privateMode,
    enhance,
    safe,
    referrer,
    token,
    test,
    cleanup,
    testFile,
    orientation,
    useVariations,
  };
};

const readFileLines = filePath => {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return fileContent.split(/\r?\n/).filter(line => line.trim() !== "");
  } catch (error) {
    console.error(`Error reading file: ${filePath}`, error.message);
    process.exit(1);
  }
};

const slugify = text => {
  let slug = text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
  // Truncate to prevent filename too long errors (max ~100 chars for slug)
  return slug.length > 100 ? slug.substring(0, 100) : slug;
};

const generateImage = async (
  prompt,
  model,
  seed,
  width,
  height,
  image,
  nologo,
  privateMode,
  enhance,
  safe,
  referrer,
  token
) => {
  let queryParams = new URLSearchParams();

  if (model !== "default") {
    queryParams.append("model", model);
  }

  if (seed !== null && !isNaN(seed)) {
    queryParams.append("seed", seed.toString());
  }

  if (width !== null && !isNaN(width)) {
    queryParams.append("width", width.toString());
  }

  if (height !== null && !isNaN(height)) {
    queryParams.append("height", height.toString());
  }

  if (image && ["kontext", "nanobanana", "seedream"].includes(model)) {
    queryParams.append("image", image);
  }

  if (nologo) {
    queryParams.append("nologo", "true");
  }

  if (privateMode) {
    queryParams.append("private", "true");
  }

  if (enhance) {
    queryParams.append("enhance", "true");
  }

  if (safe) {
    queryParams.append("safe", "true");
  }

  if (referrer) {
    queryParams.append("referrer", referrer);
  }
  if (token) {
    queryParams.append("token", token);
  }

  const queryString = queryParams.toString();
  const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}${queryString ? `?${queryString}` : ""}`;

  const headers = {
    Authorization: `Bearer ${process.env.POLLINATIONS_API_KEY}`,
  };

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`Fetching image from: ${url} (attempt ${attempt + 1}/${maxRetries})`);
      const response = await axios({
        method: "get",
        url,
        headers,
        responseType: "arraybuffer",
        timeout: 60000,
      });
      return response.data;
    } catch (error) {
      attempt++;
      if (error.response && error.response.status === 502) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Exponential backoff: 1s, 2s, 4s, max 30s
        console.error(
          `502 Bad Gateway error (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`
        );
        if (attempt < maxRetries) {
          await delay(delay);
        } else {
          console.error("Max retries reached for 502 error. Skipping this generation.");
        }
      } else {
        console.error("Error fetching image:", error.message);
        if (error.response) {
          console.error("Response status:", error.response.status);
          console.error("Response data:", error.response.data);
        }
        return null;
      }
    }
  }

  return null;
};

const generateVariations = async (originalPrompt, count, token) => {
  if (count <= 1) {
    return [{ prompt: originalPrompt, metadata: {} }];
  }

  const metaPrompt = `Generate exactly ${count} diverse and creative variations for image prompts based on the theme: "${originalPrompt}".

Each variation should be a detailed prompt for AI image generation with creative flavor names and descriptions.

Return ONLY a valid JSON array with this exact structure:
[
  {
    "prompt": "detailed image generation prompt here",
    "metadata": {
      "flavor": "creative flavor name",
      "description": "brief flavor description",
      "ingredients": "key flavor notes or ingredients"
    }
  }
]

No introduction, explanation, or conclusion. Only the JSON array.`;

  console.log("Using text model: openai for variations generation");
  console.log("Sending meta-prompt to text API:", metaPrompt);

  const url = "https://gen.pollinations.ai/v1/chat/completions";

  const payload = {
    model: "openai",
    messages: [
      {
        role: "system",
        content: "You are a JSON generator. Always output valid JSON arrays.",
      },
      {
        role: "user",
        content: metaPrompt,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.POLLINATIONS_API_KEY}`,
  };

  try {
    console.log("Fetching prompt variations from Pollinations text API...");
    const response = await axios({
      method: "post",
      url,
      headers,
      data: payload,
      responseType: "text",
      timeout: 60000,
    });

    let text = response.data.trim();

    // Parse the new API response format
    try {
      const result = JSON.parse(text);
      text = result.choices?.[0]?.message?.content || text;
    } catch (e) {
      console.log("Response is not in new API format, using raw text");
    }

    // Clean up response to ensure it's valid JSON
    if (!text.startsWith("[") && !text.startsWith("{")) {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }
    }

    // Parse JSON array
    let variations = [];
    try {
      variations = JSON.parse(text);
      if (!Array.isArray(variations)) {
        throw new Error("Response is not a JSON array");
      }

      // Validate structure and fill missing fields
      variations = variations.map((item, index) => {
        if (typeof item === "string") {
          // Handle case where it's just strings
          return {
            prompt: item,
            metadata: {
              flavor: `Variation ${index + 1}`,
              description: "Generated flavor",
              ingredients: "Various",
            },
          };
        }

        // Ensure proper structure
        return {
          prompt: item.prompt || item.text || originalPrompt,
          metadata: {
            flavor: item.metadata?.flavor || item.flavor || `Flavor ${index + 1}`,
            description:
              item.metadata?.description || item.description || "Creative flavor combination",
            ingredients: item.metadata?.ingredients || item.ingredients || "Artisanal ingredients",
          },
        };
      });

      console.log(`Successfully parsed ${variations.length} variations from JSON response`);
    } catch (parseError) {
      console.error("Error parsing JSON variations:", parseError.message);
      console.log("Raw response:", text.substring(0, 500) + "...");
      throw parseError;
    }

    // Fallback if not enough variations
    while (variations.length < count) {
      variations.push({ prompt: originalPrompt, metadata: {} });
    }

    console.log("Received variations from text API:");
    variations.forEach((item, idx) => {
      console.log(`${idx + 1}. Prompt: ${item.prompt}`);
      console.log(`   Flavor: ${item.metadata.flavor || "N/A"}`);
      console.log(`   Description: ${item.metadata.description || "N/A"}`);
      console.log(`   Ingredients: ${item.metadata.ingredients || "N/A"}`);
    });
    console.log(`Generated ${variations.length} prompt variations with metadata.`);
    return variations;
  } catch (error) {
    console.error("Error generating variations:", error.message);
    console.log("Falling back to original prompt for all generations.");
    return Array(count).fill({ prompt: originalPrompt, metadata: {} });
  }
};

const addImageMetadata = async (imagePath, prompt, model, extraMetadata = {}) => {
  try {
    if (!exifTool) {
      exifTool = new ExifTool();
    }

    const metadata = {
      ImageDescription: prompt,
      Artist: "ColorVerse AI Generator",
      Software: "ColorVerse",
      Model: model,
      DateTime: new Date().toISOString(),
      Copyright: "© ColorVerse - Free AI-Generated Images",
    };

    // Add flavor metadata using Lightroom-compatible fields
    if (extraMetadata.flavor) {
      metadata["Title"] = extraMetadata.flavor; // Lightroom "Title" field (highly visible)
      metadata["ObjectName"] = extraMetadata.flavor; // IPTC Title field backup
    }
    if (extraMetadata.description) {
      metadata["Caption-Abstract"] = extraMetadata.description; // IPTC Caption field (visible in Lightroom)
      metadata["UserComment"] = extraMetadata.description; // EXIF UserComment field
    }
    if (extraMetadata.ingredients) {
      metadata["Keywords"] = Array.isArray(extraMetadata.ingredients)
        ? extraMetadata.ingredients.join(", ")
        : extraMetadata.ingredients; // Lightroom "Keywords" field (searchable)
    }

    await exifTool.write(imagePath, metadata);
    console.log(`Metadata added to ${imagePath}`);

    // Delete temporary _original file immediately after successful metadata write
    const tempFile = `${imagePath}_original`;
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
      console.log(`Deleted temporary file: ${tempFile}`);
    }
  } catch (error) {
    console.error("Error adding metadata:", error.message);
  }
};

const testImageMetadata = async imagePath => {
  try {
    if (!exifTool) {
      exifTool = new ExifTool();
    }

    console.log(`Testing metadata for: ${imagePath}`);
    const metadata = await exifTool.read(imagePath);

    console.log("=== Image Metadata ===");
    console.log("ImageDescription:", metadata.ImageDescription || "Not found");
    console.log("Artist:", metadata.Artist || "Not found");
    console.log("Software:", metadata.Software || "Not found");
    console.log("Model:", metadata.Model || "Not found");
    console.log("DateTime:", metadata.DateTime || "Not found");
    console.log("Copyright:", metadata.Copyright || "Not found");
    console.log("");
    console.log("=== Lightroom-Compatible Flavor Metadata ===");
    console.log("Title (Flavor Name):", metadata.Title || "Not found");
    console.log("Caption-Abstract (Description):", metadata["Caption-Abstract"] || "Not found");
    console.log("Keywords (Ingredients):", metadata.Keywords || "Not found");
    console.log("=====================");

    return metadata;
  } catch (error) {
    console.error("Error reading metadata:", error.message);
    return null;
  }
};

const cleanupTemporaryFiles = async () => {
  try {
    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) {
      console.log("Output directory does not exist, nothing to clean up.");
      return;
    }

    const files = fs.readdirSync(outputDir);
    const tempFiles = files.filter(file => file.endsWith("_original"));

    for (const file of tempFiles) {
      const filePath = path.join(outputDir, file);
      fs.unlinkSync(filePath);
      console.log(`Removed temporary file: ${filePath}`);
    }

    console.log(`Cleaned up ${tempFiles.length} temporary files.`);
  } catch (error) {
    console.error("Error cleaning up temporary files:", error.message);
  }
};

const saveImageAndPrompt = async (imageBuffer, prompt, model, metadata = {}) => {
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = Date.now();
  const promptSlug = slugify(prompt);
  const baseFileName = `${timestamp}-${promptSlug}`;
  const imageFileName = `${baseFileName}.jpg`;
  const imageOutputPath = path.join(outputDir, imageFileName);

  try {
    await sharp(imageBuffer).toFile(imageOutputPath);

    await addImageMetadata(imageOutputPath, prompt, model, metadata);

    console.log(`Image saved to ${imageOutputPath}`);

    return { imageOutputPath };
  } catch (err) {
    console.error("Error writing to file:", err);
    throw err;
  }
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const processSinglePrompt = async (
  variation,
  model,
  width,
  height,
  image,
  nologo,
  privateMode,
  enhance,
  safe,
  referrer,
  token,
  index,
  total
) => {
  const { prompt, metadata } = variation;
  const randomSeed = Math.floor(Math.random() * 1000000000);
  console.log(
    `Generating image ${index} of ${total} with prompt: "${prompt}" (random seed: ${randomSeed})`
  );
  console.log(
    `   Metadata - Flavor: ${metadata.flavor || "N/A"}, Description: ${metadata.description || "N/A"}, Ingredients: ${metadata.ingredients || "N/A"}`
  );
  const enhancedPrompt = `${prompt}${QUALITY_ENHANCER}`;
  const imageBuffer = await generateImage(
    enhancedPrompt,
    model,
    randomSeed,
    width,
    height,
    image,
    nologo,
    privateMode,
    enhance,
    safe,
    referrer,
    token
  );
  if (imageBuffer) {
    await saveImageAndPrompt(imageBuffer, enhancedPrompt, model, metadata);
  }
};

const processMultiplePrompts = async (
  generatedVariations,
  model,
  width,
  height,
  image,
  nologo,
  privateMode,
  enhance,
  safe,
  referrer,
  token
) => {
  const total = generatedVariations.length;
  for (let i = 0; i < total; i++) {
    await processSinglePrompt(
      generatedVariations[i],
      model,
      width,
      height,
      image,
      nologo,
      privateMode,
      enhance,
      safe,
      referrer,
      token,
      i + 1,
      total
    );

    if (i < total - 1) {
      console.log(`Waiting 3 seconds before next generation...`);
      await delay(3000);
    }
  }
};

const main = async () => {
  try {
    const {
      prompt,
      model,
      count,
      inputFile,
      width,
      height,
      image,
      nologo,
      private: privateMode,
      enhance,
      safe,
      referrer,
      token,
      test,
      cleanup,
      testFile,
      orientation,
      useVariations,
    } = parseArguments();

    let effectiveWidth = width;
    let effectiveHeight = height;
    if (orientation && (!effectiveWidth || !effectiveHeight)) {
      const dims = ORIENTATIONS[orientation];
      if (!dims) {
        console.error(
          `Invalid orientation '${orientation}'. Valid options: portrait, landscape, square.`
        );
        process.exit(1);
      }
      effectiveWidth = effectiveWidth || dims.width;
      effectiveHeight = effectiveHeight || dims.height;
    }

    if (test) {
      if (testFile) {
        await testImageMetadata(testFile);
      } else {
        console.log("No test file specified. Testing latest image in output directory...");
        const outputDir = path.join(__dirname, "output");
        if (fs.existsSync(outputDir)) {
          const files = fs
            .readdirSync(outputDir)
            .filter(f => f.endsWith(".jpg") && !f.endsWith("_original.jpg"));
          if (files.length > 0) {
            const latestFile = files.sort(
              (a, b) =>
                fs.statSync(path.join(outputDir, b)).mtime -
                fs.statSync(path.join(outputDir, a)).mtime
            )[0];
            await testImageMetadata(path.join(outputDir, latestFile));
          } else {
            console.log("No JPG files found in output directory.");
          }
        } else {
          console.log("Output directory does not exist.");
        }
      }
      return;
    }

    if (cleanup) {
      await cleanupTemporaryFiles();
      return;
    }

    let variations;
    if (inputFile) {
      console.log(`Reading prompts from file: ${inputFile}`);
      const lines = readFileLines(inputFile);
      variations = lines.map(line => ({
        prompt: prompt.includes("{}") ? prompt.replace("{}", line) : `${prompt} ${line}`,
        metadata: {},
      }));
    } else if (useVariations) {
      console.log(`Using image model: ${model} for generation`);
      console.log(`Generating ${count} prompt variations using Pollinations text API...`);
      variations = await generateVariations(prompt, count, token);
    } else {
      console.log(`Using image model: ${model} for generation`);
      console.log(`Generating ${count} image(s) with prompt: "${prompt}" (variations disabled)`);
      variations = Array(count).fill({ prompt, metadata: {} });
    }
    await processMultiplePrompts(
      variations,
      model,
      effectiveWidth,
      effectiveHeight,
      image,
      nologo,
      privateMode,
      enhance,
      safe,
      referrer,
      token
    );

    console.log("Image generation process completed successfully!");
  } catch (error) {
    console.error("Fatal error in main process:", error.message);
    process.exit(1);
  } finally {
    if (exifTool) {
      await exifTool.end();
    }
  }
};

main();
