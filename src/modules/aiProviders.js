/**
 * ColorVerse - Multi-Provider AI Configuration & API Calling
 * Extracted from app.js for modularity.
 *
 * Globals defined here (used by app.js at runtime):
 *   AI_PROVIDERS, PROVIDER_PRIORITY, providerStatusTracker
 *   getAvailableProviders, updateProviderStatus
 *   callOpenRouterAPI, callGeminiAPI, callAIAPI
 *   modelSuccessTracker, updateModelSuccess, getOptimizedModelOrder
 *   resolveProviderModels, isUnavailableModelError
 *   trackApiCall, getSuggestedDelay, shouldDelayApiCall
 *
 * Runtime dependencies (defined in app.js, resolved at call time):
 *   debug, REFERRER_ID, showToast
 *
 * Model availability:
 *   Configured model lists are candidates only. Before a provider is used, its
 *   public model catalog (no credentials, no prompt data) is fetched once per
 *   MODEL_CATALOG_TTL_MS and candidates that are not listed (or are paid-only)
 *   are dropped. Models that a provider reports as retired/unknown (404/410, or
 *   400 "no longer available"/"invalid model") are remembered for the session
 *   and never requested again. Generation failures always reject with an error
 *   describing every attempt; no placeholder content is returned.
 */

// =============================================================================
// MULTI-PROVIDER AI CONFIGURATION
// =============================================================================

const JSON_SYSTEM_PROMPT =
  "You are an AI assistant that generates structured JSON data based on user requirements. Output ONLY the requested JSON object.";
const DEFAULT_POLLINATIONS_MODEL = "openai";
const MODEL_CATALOG_TTL_MS = 30 * 60 * 1000;
const MODEL_CATALOG_TIMEOUT_MS = 8000;
const MAX_DISCOVERED_MODELS = 3;
const MODEL_FALLBACK_DELAY_MS = 2000;
const PROVIDER_RECOVERY_MS = 10 * 60 * 1000;
const ERROR_DETAIL_MAX_LENGTH = 300;

// Provider configuration for multi-provider fallback.
// Model ids verified against the public catalogs on 2026-10-31.
const AI_PROVIDERS = {
  pollinations: {
    name: "Pollinations",
    baseURL: "https://gen.pollinations.ai/v1/chat/completions",
    getApiKey: () => null, // Auth handled server-side via Worker proxy
    requiresAuth: false,
    catalog: {
      url: "https://gen.pollinations.ai/text/models",
      parse: json => parsePollinationsCatalog(json),
    },
    models: ["openai", "openai-fast", "gpt-oss", "deepseek", "kimi"],
  },
  openrouter: {
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1/chat/completions",
    getApiKey: () => null, // Auth handled server-side via Worker proxy
    requiresAuth: true,
    catalog: {
      url: "https://openrouter.ai/api/v1/models",
      parse: json => parseOpenRouterCatalog(json),
      // Individual ":free" ids rotate and get retired, so always append the
      // currently listed free models after the router.
      appendDiscoveredModels: true,
    },
    // "openrouter/free" routes to whichever free model is currently live.
    models: ["openrouter/free"],
    routerModels: ["openrouter/free"],
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
    // Listing Gemini models requires an API key, so candidates come from the
    // public deprecations page: gemini-2.0-flash and gemini-1.5-* are shut down;
    // these have no announced shutdown date (checked 2026-10-31).
    models: ["gemini-3.6-flash", "gemini-3.5-flash-lite"],
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

function getContentApiUrl() {
  return (typeof window !== "undefined" && window._env?.CONTENT_API_URL) || null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Re-enable a provider once its cool-down has elapsed
function isProviderCoolingDown(providerName) {
  const status = providerStatusTracker[providerName];
  if (!status.available && status.lastFailure) {
    if (Date.now() - status.lastFailure > PROVIDER_RECOVERY_MS) {
      status.available = true;
      status.consecutiveFailures = 0;
      debug.log(`[MultiProvider] 🔄 Resetting ${providerName} availability after recovery`);
    }
  }
  return !status.available;
}

// Get available providers. With the content-api proxy, credentials live in the
// Worker, so only the cool-down applies; direct mode also needs a local key.
function getAvailableProviders() {
  const usesProxy = Boolean(getContentApiUrl());

  return PROVIDER_PRIORITY.filter(providerName => {
    const provider = AI_PROVIDERS[providerName];
    if (!usesProxy && provider.requiresAuth && !provider.getApiKey()) {
      return false;
    }
    return !isProviderCoolingDown(providerName);
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

// =============================================================================
// MODEL AVAILABILITY (public catalogs + retired-model memory)
// =============================================================================

const UNAVAILABLE_MODEL_PATTERN =
  /no longer available|not a valid model|invalid model|unknown model|model[^.]{0,60}(?:not found|does not exist|not supported|deprecated|retired|unavailable)|no endpoints found/i;

// Retired/unknown models stay excluded for the whole session.
const unavailableModels = new Map();

function modelKey(providerName, model) {
  return `${providerName}/${model}`;
}

function isUnavailableModelError(status, detail = "") {
  if (status === 404 || status === 410) {
    return true;
  }
  return (status === 400 || status === 422) && UNAVAILABLE_MODEL_PATTERN.test(detail);
}

function markModelUnavailable(providerName, model, reason) {
  unavailableModels.set(modelKey(providerName, model), reason);
  console.warn(
    `[MultiProvider] 🚫 ${providerName}/${model} is unavailable, skipping it from now on`
  );
}

function isModelUnavailable(providerName, model) {
  return unavailableModels.has(modelKey(providerName, model));
}

function isHealthyCatalogEntry(entry) {
  const healthStatus = entry?.health?.status;
  return !healthStatus || !/down|offline|unavailable|unhealthy/i.test(healthStatus);
}

// Pollinations catalog: [{ name, aliases, paid_only, output_modalities, supported_parameters, health }]
function parsePollinationsCatalog(json) {
  if (!Array.isArray(json)) {
    return null;
  }
  const ids = new Set();
  const freeModels = [];
  for (const entry of json) {
    const producesText =
      !Array.isArray(entry?.output_modalities) || entry.output_modalities.includes("text");
    if (!entry?.name || entry.paid_only || !producesText || !isHealthyCatalogEntry(entry)) {
      continue;
    }
    ids.add(entry.name);
    (entry.aliases || []).forEach(alias => ids.add(alias));
    if ((entry.supported_parameters || []).includes("response_format")) {
      freeModels.push(entry.name);
    }
  }
  return { ids, freeModels };
}

// A ":free" suffix alone is not trusted: every listed price must be zero.
function hasZeroPricing(pricing) {
  if (!pricing || typeof pricing !== "object") {
    return false;
  }
  const prices = Object.values(pricing);
  return prices.length > 0 && prices.every(price => Number(price) === 0);
}

// OpenRouter catalog: { data: [{ id, pricing, supported_parameters, architecture }] }
function parseOpenRouterCatalog(json) {
  if (!Array.isArray(json?.data)) {
    return null;
  }
  const ids = new Set();
  const freeModels = [];
  for (const entry of json.data) {
    if (!entry?.id) {
      continue;
    }
    ids.add(entry.id);
    const outputModalities = entry.architecture?.output_modalities;
    const producesText = !Array.isArray(outputModalities) || outputModalities.includes("text");
    const supportsJson = (entry.supported_parameters || []).includes("response_format");
    if (
      entry.id.endsWith(":free") &&
      hasZeroPricing(entry.pricing) &&
      producesText &&
      supportsJson
    ) {
      freeModels.push(entry.id);
    }
  }
  return { ids, freeModels };
}

const modelCatalogCache = new Map();

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller?.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

// Returns the parsed catalog, or null when it cannot be loaded. The catalog is
// advisory: without it the configured candidates are used unchanged.
function loadModelCatalog(providerName) {
  const catalog = AI_PROVIDERS[providerName].catalog;
  if (!catalog) {
    return Promise.resolve(null);
  }

  const cached = modelCatalogCache.get(providerName);
  if (cached && Date.now() - cached.fetchedAt < MODEL_CATALOG_TTL_MS) {
    return cached.promise;
  }

  const promise = fetchJsonWithTimeout(catalog.url, MODEL_CATALOG_TIMEOUT_MS)
    .then(json => {
      const parsed = catalog.parse(json);
      if (!parsed) {
        throw new Error("unexpected catalog format");
      }
      return parsed;
    })
    .catch(error => {
      console.warn(
        `[MultiProvider] ⚠️ ${AI_PROVIDERS[providerName].name} model catalog unavailable (${error.message}); using configured models`
      );
      return null;
    });

  modelCatalogCache.set(providerName, { fetchedAt: Date.now(), promise });
  return promise;
}

// Candidate models for a provider, in preference order, excluding models that
// the public catalog does not list and models already found to be retired.
async function resolveProviderModels(providerName, preferredModel = null) {
  const provider = AI_PROVIDERS[providerName];
  const configured = [...new Set([preferredModel, ...provider.models].filter(Boolean))];
  const routerModels = provider.routerModels || [];
  const catalog = await loadModelCatalog(providerName);

  let candidates = configured;
  if (catalog) {
    candidates = configured.filter(model => routerModels.includes(model) || catalog.ids.has(model));
    const discovered = catalog.freeModels
      .filter(model => !candidates.includes(model))
      .slice(0, MAX_DISCOVERED_MODELS);
    if (provider.catalog.appendDiscoveredModels || candidates.length === 0) {
      candidates = [...candidates, ...discovered];
    }
  }

  return candidates.filter(model => !isModelUnavailable(providerName, model));
}

// =============================================================================
// PROVIDER REQUESTS
// =============================================================================

function buildMessages(prompt) {
  return [
    { role: "system", content: JSON_SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];
}

function getChatCompletionContent(data) {
  return data?.choices?.[0]?.message?.content;
}

// Payloads use the content-api proxy contract: { provider, model?, body }.
const PROVIDER_ADAPTERS = {
  pollinations: {
    buildPayload: (model, prompt) => ({
      provider: "pollinations",
      body: {
        model,
        messages: buildMessages(prompt),
        response_format: { type: "json_object" },
        temperature: 0.5,
        referrer: REFERRER_ID,
      },
    }),
    extractContent: getChatCompletionContent,
  },
  openrouter: {
    buildPayload: (model, prompt) => ({
      provider: "openrouter",
      body: {
        model,
        messages: buildMessages(prompt),
        response_format: { type: "json_object" },
        temperature: 0.5,
      },
    }),
    extractContent: getChatCompletionContent,
  },
  gemini: {
    // The Worker reads the Gemini model from the top level; the Gemini API
    // rejects unknown body fields such as "model" with 400.
    buildPayload: (model, prompt) => ({
      provider: "gemini",
      model,
      body: {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: JSON_SYSTEM_PROMPT }] },
        generationConfig: { temperature: 0.5, responseMimeType: "application/json" },
      },
    }),
    extractContent: data =>
      (data?.candidates?.[0]?.content?.parts || []).map(part => part?.text || "").join(""),
  },
};

function createProviderError(providerName, model, status, detail) {
  const label = model ? `${providerName}/${model}` : providerName;
  const trimmedDetail = String(detail || "").slice(0, ERROR_DETAIL_MAX_LENGTH);
  const error = new Error(
    status ? `${label} API Error ${status}: ${trimmedDetail}` : `${label}: ${trimmedDetail}`
  );
  error.provider = providerName;
  error.model = model;
  error.status = status ?? null;
  error.modelUnavailable = Boolean(model) && isUnavailableModelError(status, trimmedDetail);
  return error;
}

function createAggregateError(message, errors) {
  const summary = errors.map(error => error.message).join(" | ");
  const error = new Error(`${message}: ${summary || "no model was attempted"}`);
  error.causes = errors;
  error.cause = errors[errors.length - 1];
  return error;
}

// Rate limits, exhausted balance, auth and missing Worker secrets affect every
// model of the provider, so remaining models are skipped.
function isProviderBlockingError(error) {
  const status = error?.status;
  if ([401, 402, 403, 429].includes(status)) {
    return true;
  }
  return status === 503 && /not configured/i.test(error.message);
}

function buildDirectRequest(providerName, model, payload) {
  const provider = AI_PROVIDERS[providerName];

  if (providerName === "pollinations") {
    const apiKey = (typeof window !== "undefined" && window._env?.POLLINATIONS_API_KEY) || "";
    return {
      url: provider.baseURL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: payload.body,
    };
  }

  const apiKey = provider.getApiKey();
  if (!apiKey) {
    throw createProviderError(
      providerName,
      null,
      null,
      "API key not configured (no proxy URL set)"
    );
  }
  if (providerName === "gemini") {
    return {
      url: `${provider.baseURL}/${model}:generateContent?key=${apiKey}`,
      headers: { "Content-Type": "application/json" },
      body: payload.body,
    };
  }
  return {
    url: provider.baseURL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...provider.extraHeaders,
    },
    body: payload.body,
  };
}

function parseJsonContent(content, providerName, model) {
  const candidates = [content, content.match(/\{[\s\S]*\}/)?.[0]].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Try the next candidate
    }
  }
  throw createProviderError(providerName, model, null, "response did not contain a JSON object");
}

// Send one generation request and return the parsed JSON object, or throw.
async function requestModel(providerName, model, prompt) {
  const adapter = PROVIDER_ADAPTERS[providerName];
  const payload = adapter.buildPayload(model, prompt);
  const contentApiUrl = getContentApiUrl();
  const request = contentApiUrl
    ? { url: contentApiUrl, headers: { "Content-Type": "application/json" }, body: payload }
    : buildDirectRequest(providerName, model, payload);

  let response;
  try {
    response = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
    });
  } catch (networkError) {
    throw createProviderError(providerName, model, null, `network error: ${networkError.message}`);
  }

  if (!response.ok) {
    const detail = await response
      .text()
      .catch(readError => `(error body could not be read: ${readError.message})`);
    throw createProviderError(providerName, model, response.status, detail);
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    throw createProviderError(
      providerName,
      model,
      null,
      `invalid response body: ${parseError.message}`
    );
  }

  const content = adapter.extractContent(data);
  if (typeof content !== "string") {
    const received = content === null ? "null" : Array.isArray(content) ? "array" : typeof content;
    throw createProviderError(
      providerName,
      model,
      null,
      `response content was ${received}, expected a JSON string`
    );
  }
  if (!content.trim()) {
    throw createProviderError(providerName, model, null, "response did not contain content");
  }
  return parseJsonContent(content, providerName, model);
}

function recordModelResult(providerName, model, success) {
  if (providerName === "pollinations") {
    updateModelSuccess(model, success);
  }
}

// Try each available model of one provider. Resolves { data, model } or
// rejects with an error whose `causes` lists every failed attempt.
async function generateWithProvider(providerName, prompt, preferredModel = null) {
  const resolvedModels = await resolveProviderModels(providerName, preferredModel);
  const models =
    providerName === "pollinations"
      ? getOptimizedModelOrder(preferredModel || DEFAULT_POLLINATIONS_MODEL, resolvedModels)
      : resolvedModels;
  const errors = [];

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    if (isModelUnavailable(providerName, model)) {
      continue;
    }

    try {
      debug.log(`[MultiProvider] 💬 Trying ${providerName}/${model} (${i + 1}/${models.length})`);
      const data = await requestModel(providerName, model, prompt);
      recordModelResult(providerName, model, true);
      debug.log(`[MultiProvider] ✅ Success with ${providerName}/${model}`);
      return { data, model };
    } catch (error) {
      errors.push(error);
      recordModelResult(providerName, model, false);
      console.warn(`[MultiProvider] ❌ ${providerName}/${model} failed:`, error.message);

      if (error.modelUnavailable) {
        markModelUnavailable(providerName, model, error.message);
        continue;
      }
      if (isProviderBlockingError(error)) {
        break;
      }
      if (i < models.length - 1) {
        await sleep(MODEL_FALLBACK_DELAY_MS);
      }
    }
  }

  if (errors.length === 0) {
    errors.push(createProviderError(providerName, null, null, "no available models"));
  }
  throw createAggregateError(`All ${AI_PROVIDERS[providerName].name} models failed`, errors);
}

// Call OpenRouter (via the content-api proxy when configured)
async function callOpenRouterAPI(prompt) {
  const { data } = await generateWithProvider("openrouter", prompt);
  return data;
}

// Call Gemini (via the content-api proxy when configured)
async function callGeminiAPI(prompt) {
  const { data } = await generateWithProvider("gemini", prompt);
  return data;
}

// Model success tracking
let modelSuccessTracker = {
  lastSuccessfulModel: DEFAULT_POLLINATIONS_MODEL,
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

// Order Pollinations candidates: last successful model, then preferred, then
// the rest, skipping models that failed within the last 10 minutes.
function getOptimizedModelOrder(
  preferredModel = DEFAULT_POLLINATIONS_MODEL,
  candidateModels = AI_PROVIDERS.pollinations.models
) {
  resetFailedModelsIfNeeded();

  const availableModels = candidateModels.filter(
    model => !modelSuccessTracker.failedModels.has(model)
  );
  const lastSuccessful = modelSuccessTracker.lastSuccessfulModel;
  const orderedModels = [lastSuccessful, preferredModel].filter(model =>
    availableModels.includes(model)
  );

  return [...new Set([...orderedModels, ...availableModels])];
}

// Unified AI API calling function with model and provider fallback.
// Resolves with the parsed JSON object or rejects with an aggregated error.
async function callAIAPI(prompt, preferredModel = DEFAULT_POLLINATIONS_MODEL) {
  // Check if we should delay the API call due to rate limiting
  const suggestedDelay = getSuggestedDelay();
  if (suggestedDelay > 0) {
    debug.log(`Rate limiting: waiting ${suggestedDelay}ms before API call`);
    await sleep(suggestedDelay);
  }

  // Track this API call
  trackApiCall();

  const errors = [];
  for (const providerName of getAvailableProviders()) {
    try {
      const { data, model } = await generateWithProvider(
        providerName,
        prompt,
        providerName === "pollinations" ? preferredModel : null
      );
      updateProviderStatus(providerName, true);

      if (typeof showToast === "function") {
        if (providerName !== PROVIDER_PRIORITY[0]) {
          showToast(
            `Generated content using ${AI_PROVIDERS[providerName].name} fallback`,
            "info",
            3000
          );
        } else if (model !== preferredModel) {
          showToast(`Generated content using ${model} model`, "info", 3000);
        }
      }
      return data;
    } catch (error) {
      updateProviderStatus(providerName, false);
      errors.push(...(error.causes || [error]));
      debug.log(`[MultiProvider] 🔄 ${providerName} failed, trying next provider...`);
    }
  }

  console.error("[MultiProvider] ❌ All providers exhausted", {
    lastSuccessful: modelSuccessTracker.lastSuccessfulModel,
    failedModels: Array.from(modelSuccessTracker.failedModels),
    unavailableModels: Array.from(unavailableModels.keys()),
  });
  throw createAggregateError("All AI providers failed to generate content", errors);
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
    lastSuccessfulModel: DEFAULT_POLLINATIONS_MODEL,
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
