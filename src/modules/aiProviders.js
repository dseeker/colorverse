/**
 * ColorVerse - Multi-Provider AI Configuration & API Calling
 * Extracted from app.js for modularity.
 *
 * Globals defined here (used by app.js at runtime):
 *   AI_PROVIDERS, PROVIDER_PRIORITY, providerStatusTracker
 *   getAvailableProviders, updateProviderStatus
 *   callOpenRouterAPI, callGeminiAPI, callAIAPI
 *   modelSuccessTracker, updateModelSuccess, getOptimizedModelOrder
 *   trackApiCall, getSuggestedDelay, shouldDelayApiCall
 *
 * Runtime dependencies (defined in app.js, resolved at call time):
 *   debug, REFERRER_ID, showToast
 */

// =============================================================================
// MULTI-PROVIDER AI CONFIGURATION
// =============================================================================

// Provider configuration for multi-provider fallback
const AI_PROVIDERS = {
  pollinations: {
    name: "Pollinations",
    baseURL: "https://gen.pollinations.ai/v1/chat/completions",
    getApiKey: () => null, // Auth handled server-side via Worker proxy
    requiresAuth: false,
    models: [
      "openai",
      "openai-fast",
      "openai-large",
      "mistral",
      "gemini-fast",
      "llamascout",
      "phi",
    ],
  },
  openrouter: {
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1/chat/completions",
    getApiKey: () => null, // Auth handled server-side via Worker proxy
    requiresAuth: true,
    models: [
      "meta-llama/llama-3.3-8b-instruct:free",
      "mistralai/mistral-7b-instruct:free",
      "google/gemma-2-9b-it:free",
    ],
    extraHeaders: {
      "HTTP-Referer": "https://dseeker.github.io",
      "X-Title": "ColorVerse",
    },
  },
  gemini: {
    name: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/models",
    getApiKey: () => null, // Auth handled server-side via Worker proxy
    requiresAuth: true,
    models: ["gemini-2.0-flash", "gemini-1.5-flash"],
  },
};

// Provider priority for fallback
const PROVIDER_PRIORITY = ["pollinations", "openrouter", "gemini"];

// Provider status tracking
const providerStatusTracker = {
  pollinations: { available: true, lastFailure: null, consecutiveFailures: 0 },
  openrouter: { available: true, lastFailure: null, consecutiveFailures: 0 },
  gemini: { available: true, lastFailure: null, consecutiveFailures: 0 },
};

// Get available providers (filters out unavailable and those without API keys)
function getAvailableProviders() {
  const now = Date.now();
  const recoveryTime = 10 * 60 * 1000; // 10 minutes

  return PROVIDER_PRIORITY.filter(providerName => {
    const provider = AI_PROVIDERS[providerName];
    const status = providerStatusTracker[providerName];

    // Reset unavailable status after recovery time
    if (!status.available && status.lastFailure) {
      if (now - status.lastFailure > recoveryTime) {
        status.available = true;
        status.consecutiveFailures = 0;
        debug.log(`[MultiProvider] 🔄 Resetting ${providerName} availability after recovery`);
      }
    }

    // Skip if provider requires auth and doesn't have API key
    if (provider.requiresAuth && !provider.getApiKey()) {
      return false;
    }

    return status.available;
  });
}

// Update provider status after success/failure
function updateProviderStatus(providerName, success) {
  const status = providerStatusTracker[providerName];
  if (success) {
    status.consecutiveFailures = 0;
    status.available = true;
  } else {
    status.lastFailure = Date.now();
    status.consecutiveFailures++;
    if (status.consecutiveFailures >= 3) {
      status.available = false;
      console.warn(`[MultiProvider] 🚫 Marking ${providerName} as temporarily unavailable`);
    }
  }
}

// Call OpenRouter API
async function callOpenRouterAPI(prompt) {
  const provider = AI_PROVIDERS.openrouter;

  // Route through server-side proxy if configured
  const contentApiUrl = window._env?.CONTENT_API_URL;
  if (contentApiUrl) {
    const models = provider.models;
    let lastError = null;
    for (const model of models) {
      try {
        debug.log(`[MultiProvider] 💬 Trying OpenRouter/${model} via proxy`);
        const response = await fetch(contentApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "openrouter",
            body: {
              model: model,
              messages: [
                {
                  role: "system",
                  content:
                    "You are an AI assistant that generates structured JSON data. Output ONLY the requested JSON object.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.5,
              max_tokens: 4096,
            },
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenRouter API Error ${response.status}: ${errorText}`);
        }
        const result = await response.json();
        const content = result?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("OpenRouter response empty");
        }
        const parsedData = JSON.parse(content);
        debug.log(`[MultiProvider] ✅ Success with OpenRouter/${model}`);
        return parsedData;
      } catch (error) {
        console.warn(`[MultiProvider] ❌ OpenRouter/${model} failed:`, error.message);
        lastError = error;
      }
    }
    throw lastError || new Error("All OpenRouter models failed");
  }

  // Dev/local fallback - no proxy configured, requires direct API key
  throw new Error("OpenRouter API key not configured (no proxy URL set)");
}

// Call OpenRouter API (direct, dev fallback - unused when proxy is configured)
async function _callOpenRouterAPIDirect(prompt) {
  const provider = AI_PROVIDERS.openrouter;
  const apiKey = provider.getApiKey();

  if (!apiKey) {
    throw new Error("OpenRouter API key not configured");
  }

  const models = provider.models;
  let lastError = null;

  for (const model of models) {
    try {
      debug.log(`[MultiProvider] 💬 Trying OpenRouter/${model}`);

      const response = await fetch(provider.baseURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...provider.extraHeaders,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content:
                "You are an AI assistant that generates structured JSON data. Output ONLY the requested JSON object.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.5,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const content = result?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("OpenRouter response empty");
      }

      const parsedData = JSON.parse(content);
      debug.log(`[MultiProvider] ✅ Success with OpenRouter/${model}`);
      return parsedData;
    } catch (error) {
      console.warn(`[MultiProvider] ❌ OpenRouter/${model} failed:`, error.message);
      lastError = error;
    }
  }

  throw lastError || new Error("All OpenRouter models failed");
}

// Call Gemini API
async function callGeminiAPI(prompt) {
  const provider = AI_PROVIDERS.gemini;

  // Route through server-side proxy if configured
  const contentApiUrl = window._env?.CONTENT_API_URL;
  if (contentApiUrl) {
    const models = provider.models;
    let lastError = null;
    for (const model of models) {
      try {
        debug.log(`[MultiProvider] 💬 Trying Gemini/${model} via proxy`);
        const response = await fetch(contentApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "gemini",
            body: {
              model: model,
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              systemInstruction: {
                parts: [
                  {
                    text: "You are an AI assistant that generates structured JSON data. Output ONLY the requested JSON object.",
                  },
                ],
              },
              generationConfig: { temperature: 0.5, maxOutputTokens: 4096 },
            },
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
        }
        const result = await response.json();
        const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
          throw new Error("Gemini response empty");
        }
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedData = JSON.parse(jsonMatch[0]);
          debug.log(`[MultiProvider] ✅ Success with Gemini/${model}`);
          return parsedData;
        }
        throw new Error("Gemini response does not contain valid JSON");
      } catch (error) {
        console.warn(`[MultiProvider] ❌ Gemini/${model} failed:`, error.message);
        lastError = error;
      }
    }
    throw lastError || new Error("All Gemini models failed");
  }

  // Dev/local fallback - no proxy configured, requires direct API key
  const apiKey = provider.getApiKey();

  if (!apiKey) {
    throw new Error("Gemini API key not configured (no proxy URL set)");
  }

  const models = provider.models;
  let lastError = null;

  for (const model of models) {
    try {
      debug.log(`[MultiProvider] 💬 Trying Gemini/${model}`);

      const url = `${provider.baseURL}/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          systemInstruction: {
            parts: [
              {
                text: "You are an AI assistant that generates structured JSON data. Output ONLY the requested JSON object.",
              },
            ],
          },
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error("Gemini response empty");
      }

      // Try to parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        debug.log(`[MultiProvider] ✅ Success with Gemini/${model}`);
        return parsedData;
      }

      throw new Error("Gemini response does not contain valid JSON");
    } catch (error) {
      console.warn(`[MultiProvider] ❌ Gemini/${model} failed:`, error.message);
      lastError = error;
    }
  }

  throw lastError || new Error("All Gemini models failed");
}

// Model success tracking
let modelSuccessTracker = {
  lastSuccessfulModel: "openai",
  failedModels: new Set(),
  successCount: {},
  lastUpdateTime: Date.now(),
};

// Reset failed models after 10 minutes (models might recover)
function resetFailedModelsIfNeeded() {
  const now = Date.now();
  const resetInterval = 10 * 60 * 1000; // 10 minutes

  if (now - modelSuccessTracker.lastUpdateTime > resetInterval) {
    debug.log("Resetting failed models tracker after 10 minutes");
    modelSuccessTracker.failedModels.clear();
    modelSuccessTracker.lastUpdateTime = now;
  }
}

// Update model success tracking
function updateModelSuccess(modelName, success) {
  modelSuccessTracker.lastUpdateTime = Date.now();

  if (success) {
    modelSuccessTracker.lastSuccessfulModel = modelName;
    modelSuccessTracker.successCount[modelName] =
      (modelSuccessTracker.successCount[modelName] || 0) + 1;
    // Remove from failed models if it was there
    modelSuccessTracker.failedModels.delete(modelName);
    console.log(
      `✅ Model ${modelName} marked as successful (total successes: ${modelSuccessTracker.successCount[modelName]})`
    );
  } else {
    modelSuccessTracker.failedModels.add(modelName);
    debug.log(`❌ Model ${modelName} marked as failed`);
  }
}

// Get optimized model order based on success history
function getOptimizedModelOrder(preferredModel = "openai") {
  resetFailedModelsIfNeeded();

  // Define model fallback chain based on tier and capability
  const allModels = [
    "openai", // GPT-4o Mini (primary)
    "openai-fast", // GPT-4.1 Nano (fast fallback)
    "mistral", // Mistral Small 3.1 24B (reliable)
    "llamascout", // Llama 4 Scout 17B (new option)
    "llama-roblox", // Llama 3.1 8B (stable)
    "gemma-roblox", // Gemma 2 9B (lightweight)
    "glm", // GLM-4 9B (alternative)
    "phi", // Phi-4 Mini (fallback)
    "mistral-nemo-roblox", // Fast final fallback
    "kimi", // Kimi-K2.6 (reasoning, 256k ctx) — late fallback, slower but high-quality
  ];

  // Filter out recently failed models and sort by success
  const availableModels = allModels.filter(model => !modelSuccessTracker.failedModels.has(model));

  // If last successful model is available and different from preferred, prioritize it
  const lastSuccessful = modelSuccessTracker.lastSuccessfulModel;
  if (
    lastSuccessful &&
    lastSuccessful !== preferredModel &&
    availableModels.includes(lastSuccessful)
  ) {
    // Put last successful model first, then preferred, then others
    const orderedModels = [lastSuccessful];
    if (availableModels.includes(preferredModel) && preferredModel !== lastSuccessful) {
      orderedModels.push(preferredModel);
    }
    // Add remaining models
    availableModels.forEach(model => {
      if (!orderedModels.includes(model)) {
        orderedModels.push(model);
      }
    });
    return orderedModels;
  }

  // Otherwise start with preferred model, then use success-based ordering
  const modelsToTry =
    preferredModel !== "openai"
      ? [preferredModel, ...availableModels.filter(m => m !== preferredModel)]
      : availableModels;

  return modelsToTry;
}

// Unified AI API calling function with intelligent model fallback
async function callAIAPI(prompt, preferredModel = "openai") {
  // Check if we should delay the API call due to rate limiting
  const suggestedDelay = getSuggestedDelay();
  if (suggestedDelay > 0) {
    debug.log(`Rate limiting: waiting ${suggestedDelay}ms before API call`);
    await new Promise(resolve => setTimeout(resolve, suggestedDelay));
  }

  // Track this API call
  trackApiCall();

  const modelsToTry = getOptimizedModelOrder(preferredModel);

  const basePayload = {
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
    referrer: REFERRER_ID,
  };

  // Route through server-side proxy if configured (keys stored in Worker secrets)
  const contentApiUrl = window._env?.CONTENT_API_URL;
  if (contentApiUrl) {
    let lastProxyError = null;
    for (let i = 0; i < modelsToTry.length; i++) {
      const currentModel = modelsToTry[i];
      try {
        console.log(
          `Attempting API call via proxy with model: ${currentModel} (attempt ${i + 1}/${modelsToTry.length})`
        );
        const response = await fetch(contentApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "pollinations",
            body: {
              model: currentModel,
              messages: basePayload.messages,
              response_format: basePayload.response_format,
              temperature: basePayload.temperature,
              referrer: REFERRER_ID,
            },
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.warn(
            `Proxy model ${currentModel} failed with status ${response.status}:`,
            errorText
          );
          updateModelSuccess(currentModel, false);
          lastProxyError = new Error(`API Error ${response.status}: ${errorText}`);
          if (i < modelsToTry.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          continue;
        }
        const result = await response.json();
        const generatedContent = result?.choices?.[0]?.message?.content;
        if (!generatedContent) {
          updateModelSuccess(currentModel, false);
          lastProxyError = new Error("AI response did not contain expected content structure.");
          continue;
        }
        try {
          const parsedData = JSON.parse(generatedContent);
          updateModelSuccess(currentModel, true);
          if (i > 0 && typeof showToast === "function") {
            showToast(`Generated content using ${currentModel} model`, "info", 3000);
          }
          return parsedData;
        } catch (parseError) {
          const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const extractedData = JSON.parse(jsonMatch[0]);
            updateModelSuccess(currentModel, true);
            return extractedData;
          }
          updateModelSuccess(currentModel, false);
          lastProxyError = new Error(`Could not extract valid JSON from ${currentModel} response`);
          continue;
        }
      } catch (networkError) {
        console.warn(`Network error with proxy model ${currentModel}:`, networkError.message);
        updateModelSuccess(currentModel, false);
        lastProxyError = networkError;
        continue;
      }
    }
    // Proxy Pollinations failed, try fallback providers via proxy
    debug.log("[MultiProvider] 🔄 Pollinations proxy failed, trying fallback providers...");
    updateProviderStatus("pollinations", false);
    try {
      const orResult = await callOpenRouterAPI(prompt);
      updateProviderStatus("openrouter", true);
      if (typeof showToast === "function") {
        showToast("Generated content using OpenRouter fallback", "info", 3000);
      }
      return orResult;
    } catch (e) {
      updateProviderStatus("openrouter", false);
    }
    try {
      const gResult = await callGeminiAPI(prompt);
      updateProviderStatus("gemini", true);
      if (typeof showToast === "function") {
        showToast("Generated content using Gemini fallback", "info", 3000);
      }
      return gResult;
    } catch (e) {
      updateProviderStatus("gemini", false);
    }
    throw lastProxyError || new Error("All AI providers failed to generate content");
  }

  // Direct API calls (dev/local or when no proxy configured)
  const url = "https://gen.pollinations.ai/v1/chat/completions";

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${window._env?.POLLINATIONS_API_KEY || ""}`,
  };

  let lastError = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];

    try {
      console.log(
        `Attempting API call with model: ${currentModel} (attempt ${i + 1}/${modelsToTry.length})`
      );

      const payload = {
        ...basePayload,
        model: currentModel,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`API Error ${response.status}: ${errorText}`);

        // Log the error details
        console.warn(`Model ${currentModel} failed with status ${response.status}:`, errorText);

        // Mark model as failed
        updateModelSuccess(currentModel, false);

        // Check if this is a temporary rate limit or content policy issue
        if (response.status === 403 || response.status === 429) {
          lastError = error;

          // If we have more models to try, add delay before next attempt
          if (i < modelsToTry.length - 1) {
            debug.log(`Waiting 5 seconds before trying next model...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            debug.log(`Trying next model in fallback chain...`);
            continue;
          }
        }

        // For other errors, add shorter delay and try next model
        lastError = error;
        if (i < modelsToTry.length - 1) {
          debug.log(`Waiting 2 seconds before trying next model...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        continue;
      }

      const result = await response.json();
      const generatedContent = result?.choices?.[0]?.message?.content;

      if (!generatedContent) {
        const error = new Error("AI response did not contain expected content structure.");
        console.warn(`Model ${currentModel} returned empty content`);
        updateModelSuccess(currentModel, false);
        lastError = error;
        continue;
      }

      // Parse JSON response
      try {
        const parsedData = JSON.parse(generatedContent);
        debug.log(`✅ Successfully generated data using model: ${currentModel}`);

        // Mark model as successful
        updateModelSuccess(currentModel, true);

        // Show success toast if we had to fallback
        if (i > 0 && typeof showToast === "function") {
          showToast(`Generated content using ${currentModel} model`, "info", 3000);
        }

        return parsedData;
      } catch (parseError) {
        // Try to extract JSON from response
        const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extractedData = JSON.parse(jsonMatch[0]);
            debug.log(`✅ Successfully extracted JSON from ${currentModel} response`);

            // Mark model as successful
            updateModelSuccess(currentModel, true);

            if (i > 0 && typeof showToast === "function") {
              showToast(`Generated content using ${currentModel} model`, "info", 3000);
            }

            return extractedData;
          } catch (extractError) {
            console.warn(`Model ${currentModel} JSON extraction failed:`, extractError.message);
            updateModelSuccess(currentModel, false);
            lastError = new Error(`Could not extract valid JSON from ${currentModel} response`);

            // Add delay before trying next model for parsing errors
            if (i < modelsToTry.length - 1) {
              debug.log(`Waiting 2 seconds before trying next model due to parsing error...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            continue;
          }
        } else {
          console.warn(`Model ${currentModel} response does not contain valid JSON`);
          updateModelSuccess(currentModel, false);
          lastError = new Error(`${currentModel} response does not contain valid JSON`);

          // Add delay before trying next model for JSON format errors
          if (i < modelsToTry.length - 1) {
            debug.log(`Waiting 2 seconds before trying next model due to JSON format error...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          continue;
        }
      }
    } catch (networkError) {
      console.warn(`Network error with model ${currentModel}:`, networkError.message);
      updateModelSuccess(currentModel, false);
      lastError = networkError;

      // Add delay before trying next model for network errors
      if (i < modelsToTry.length - 1) {
        debug.log(`Waiting 3 seconds before trying next model due to network error...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      continue;
    }
  }

  // If all models failed, throw the last error
  console.error("All AI models failed. Last error:", lastError);
  console.log("Current model status:", {
    lastSuccessful: modelSuccessTracker.lastSuccessfulModel,
    failedModels: Array.from(modelSuccessTracker.failedModels),
    successCounts: modelSuccessTracker.successCount,
  });

  // =========================================================================
  // MULTI-PROVIDER FALLBACK: Try OpenRouter and Gemini if Pollinations fails
  // =========================================================================
  debug.log("[MultiProvider] 🔄 Pollinations failed, trying fallback providers...");
  updateProviderStatus("pollinations", false);

  // Try OpenRouter
  const openRouterKey = AI_PROVIDERS.openrouter.getApiKey();
  if (openRouterKey) {
    try {
      debug.log("[MultiProvider] 📡 Attempting OpenRouter fallback...");
      const result = await callOpenRouterAPI(prompt);
      updateProviderStatus("openrouter", true);

      if (typeof showToast === "function") {
        showToast("Generated content using OpenRouter fallback", "info", 3000);
      }

      return result;
    } catch (openRouterError) {
      console.warn("[MultiProvider] ❌ OpenRouter fallback failed:", openRouterError.message);
      updateProviderStatus("openrouter", false);
    }
  }

  // Try Gemini
  const geminiKey = AI_PROVIDERS.gemini.getApiKey();
  if (geminiKey) {
    try {
      debug.log("[MultiProvider] 📡 Attempting Gemini fallback...");
      const result = await callGeminiAPI(prompt);
      updateProviderStatus("gemini", true);

      if (typeof showToast === "function") {
        showToast("Generated content using Gemini fallback", "info", 3000);
      }

      return result;
    } catch (geminiError) {
      console.warn("[MultiProvider] ❌ Gemini fallback failed:", geminiError.message);
      updateProviderStatus("gemini", false);
    }
  }

  // All providers failed
  console.error("[MultiProvider] ❌ All providers exhausted (Pollinations, OpenRouter, Gemini)");

  if (typeof showToast === "function") {
    showToast("All AI providers are currently unavailable. Please try again later.", "error", 5000);
  }

  throw lastError || new Error("All AI providers failed to generate content");
}

// Get current model status for debugging
function getModelStatus() {
  return {
    lastSuccessful: modelSuccessTracker.lastSuccessfulModel,
    failedModels: Array.from(modelSuccessTracker.failedModels),
    successCounts: { ...modelSuccessTracker.successCount },
    lastUpdate: new Date(modelSuccessTracker.lastUpdateTime).toLocaleString(),
  };
}

// Manually reset model tracking (useful for debugging)
function resetModelTracking() {
  modelSuccessTracker = {
    lastSuccessfulModel: "openai",
    failedModels: new Set(),
    successCount: {},
    lastUpdateTime: Date.now(),
  };
  debug.log("Model tracking reset to defaults");
}

// Make these functions available globally for debugging
window.getModelStatus = getModelStatus;
window.resetModelTracking = resetModelTracking;

// API call rate limiting tracking
const apiCallTracker = {
  calls: [],
  maxCallsPerMinute: 20, // Adjust based on API limits
};

// Function to check if we should delay API calls
function shouldDelayApiCall() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Remove calls older than 1 minute
  apiCallTracker.calls = apiCallTracker.calls.filter(time => time > oneMinuteAgo);

  return apiCallTracker.calls.length >= apiCallTracker.maxCallsPerMinute;
}

// Function to track API calls
function trackApiCall() {
  apiCallTracker.calls.push(Date.now());
}

// Function to get suggested delay based on current call rate
function getSuggestedDelay() {
  if (apiCallTracker.calls.length >= apiCallTracker.maxCallsPerMinute) {
    return 3000; // 3 second delay if approaching limit
  } else if (apiCallTracker.calls.length >= apiCallTracker.maxCallsPerMinute * 0.8) {
    return 1000; // 1 second delay if at 80% of limit
  }
  return 0; // No delay needed
}

// Make rate limiting functions available for debugging
window.getApiCallStatus = () => ({
  recentCalls: apiCallTracker.calls.length,
  maxCallsPerMinute: apiCallTracker.maxCallsPerMinute,
  shouldDelay: shouldDelayApiCall(),
  suggestedDelay: getSuggestedDelay(),
});
