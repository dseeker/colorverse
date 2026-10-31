/**
 * MultiProviderAIManager - Browser-compatible multi-provider AI fallback system
 *
 * Features:
 * - Provider-level fallback (Pollinations → OpenRouter → Gemini)
 * - Model-level fallback within each provider
 * - Rate limit detection (429, 403)
 * - Exponential backoff
 * - Success tracking for intelligent routing
 * - Retired/unknown models (404/410, 400 "no longer available") are skipped
 *   for the rest of the session
 * - Failures reject with an error whose `causes` lists every attempt
 */

import AI_PROVIDERS, {
  PROVIDER_PRIORITY,
  RETRY_CONFIG,
  FALLBACK_ERRORS,
  isUnavailableModelError,
} from "./aiProviderConfig.js";

function createAggregateError(message, errors) {
  const summary = errors.map(error => error.message).join(" | ");
  const error = new Error(`${message}: ${summary || "no model was attempted"}`);
  error.causes = errors;
  error.cause = errors[errors.length - 1];
  return error;
}

class MultiProviderAIManager {
  constructor(options = {}) {
    this.providers = AI_PROVIDERS;
    this.providerPriority = options.providerPriority || PROVIDER_PRIORITY;
    this.retryConfig = { ...RETRY_CONFIG, ...options.retryConfig };

    // Success tracking
    this.providerStatus = {};
    for (const provider of this.providerPriority) {
      this.providerStatus[provider] = {
        available: true,
        lastSuccess: null,
        lastFailure: null,
        consecutiveFailures: 0,
        modelSuccesses: {},
      };
    }

    // "provider/model" keys reported as retired or unknown
    this.unavailableModels = new Set();

    // Logging
    this.debug = options.debug ?? true;
  }

  log(...args) {
    if (this.debug) {
      console.log("[MultiProviderAI]", ...args);
    }
  }

  warn(...args) {
    console.warn("[MultiProviderAI]", ...args);
  }

  error(...args) {
    console.error("[MultiProviderAI]", ...args);
  }

  /**
   * Main method - creates a chat completion with automatic fallback
   */
  async createChatCompletion(messages, options = {}) {
    const availableProviders = this.getAvailableProviders();

    this.log(`🔄 Fallback chain: ${availableProviders.join(" → ")}`);

    const errors = [];

    for (const providerName of availableProviders) {
      const result = await this.tryProviderWithFallback(providerName, messages, options);

      if (result.success) {
        this.log(`✅ Success with ${providerName}/${result.data.model}`);
        return result.data;
      }

      errors.push(...(result.error.causes || [result.error]));
      this.warn(`⚠️ ${providerName} failed, trying next provider...`);
    }

    // All providers failed
    this.error("❌ All AI providers failed");
    throw createAggregateError("All AI providers failed", errors);
  }

  /**
   * Try a single provider with model-level fallback
   */
  async tryProviderWithFallback(providerName, messages, options) {
    const provider = this.providers[providerName];
    if (!provider) {
      return { success: false, error: new Error(`Unknown provider: ${providerName}`) };
    }

    // Check if provider requires auth and has key
    const apiKey = provider.getApiKey();
    if (provider.requiresAuth && !apiKey) {
      this.log(`⏭️ Skipping ${providerName} - no API key configured`);
      return { success: false, error: new Error(`${providerName} requires API key`) };
    }

    // Get models to try for this provider
    const modelsToTry = (
      options.model ? [options.model] : this.getModelsForProvider(providerName)
    ).filter(model => !this.isModelUnavailable(providerName, model));
    const errors = [];

    for (const model of modelsToTry) {
      const result = await this.tryModelWithRetries(providerName, model, messages, options);

      if (result.success) {
        this.updateProviderSuccess(providerName, model, true);
        return result;
      }

      errors.push(result.error);
      this.updateProviderSuccess(providerName, model, false);

      if (result.error?.modelUnavailable) {
        this.markModelUnavailable(providerName, model);
        continue;
      }

      // Check if we should skip remaining models (rate limit, quota)
      if (this.shouldSkipProvider(result.error)) {
        this.log(
          `🚫 Provider ${providerName} rate limited/quota exceeded, moving to next provider`
        );
        break;
      }

      // Add delay between model attempts
      await this.sleep(this.retryConfig.modelFallbackDelay);
    }

    return {
      success: false,
      error: createAggregateError(`All models failed for ${providerName}`, errors),
    };
  }

  /**
   * Try a single model with retries
   */
  async tryModelWithRetries(providerName, modelId, messages, options) {
    const provider = this.providers[providerName];
    const maxRetries = this.retryConfig.maxRetries;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        this.log(`💬 Using ${providerName}/${modelId} (attempt ${attempt + 1}/${maxRetries})`);

        const response = await this.callProvider(providerName, modelId, messages, options);
        return { success: true, data: response };
      } catch (error) {
        lastError = error;
        this.warn(`❌ ${providerName}/${modelId} attempt ${attempt + 1} failed:`, error.message);

        // Don't retry for certain error types
        if (this.shouldNotRetry(error)) {
          return { success: false, error };
        }

        // Exponential backoff
        if (attempt < maxRetries - 1) {
          const delay = this.retryConfig.backoffDelays[attempt] || 30000;
          this.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError || new Error(`All retries failed for ${providerName}/${modelId}`),
    };
  }

  /**
   * Call a specific provider's API
   */
  async callProvider(providerName, modelId, messages, options) {
    const provider = this.providers[providerName];
    const apiKey = provider.getApiKey();

    // Build URL
    let url = `${provider.baseURL}${provider.endpoint}`;
    if (providerName === "gemini") {
      url = url.replace("{model}", modelId);
      if (apiKey) {
        url += `?key=${apiKey}`;
      }
    }

    // Build request body
    const requestBody = provider.formatRequest(messages, { ...options, model: modelId });

    // Build headers
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(provider.extraHeaders || {}),
    };

    // Add authorization (except for Gemini which uses query param)
    if (providerName !== "gemini" && apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // Make request
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = (await response.text()).slice(0, 300);
      const error = new Error(
        `${providerName}/${modelId} API Error ${response.status}: ${errorText}`
      );
      error.status = response.status;
      error.provider = providerName;
      error.model = modelId;
      error.modelUnavailable = isUnavailableModelError(response.status, errorText);
      throw error;
    }

    const data = await response.json();
    const parsed = provider.parseResponse(data);
    if (!parsed.content) {
      const error = new Error(`${providerName}/${modelId} returned an empty response`);
      error.provider = providerName;
      error.model = modelId;
      throw error;
    }
    parsed.model = modelId;
    parsed.provider = providerName;

    return parsed;
  }

  /**
   * Get available providers (filters out unavailable ones)
   */
  getAvailableProviders() {
    const now = Date.now();
    const recoveryTime = 10 * 60 * 1000; // 10 minutes

    return this.providerPriority.filter(providerName => {
      const status = this.providerStatus[providerName];

      // Reset unavailable status after recovery time
      if (!status.available && status.lastFailure) {
        if (now - status.lastFailure > recoveryTime) {
          status.available = true;
          status.consecutiveFailures = 0;
          this.log(`🔄 Resetting ${providerName} availability after recovery period`);
        }
      }

      // Check if provider has API key (for required auth)
      const provider = this.providers[providerName];
      if (provider.requiresAuth && !provider.getApiKey()) {
        return false;
      }

      return status.available;
    });
  }

  /**
   * Get models to try for a provider (in order of preference)
   */
  getModelsForProvider(providerName) {
    const provider = this.providers[providerName];
    const status = this.providerStatus[providerName];

    // If we have success history, prioritize successful models
    const successfulModels = Object.entries(status.modelSuccesses)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([model]) => model);

    if (successfulModels.length > 0) {
      // Put successful models first, then others
      const otherModels = provider.models.filter(m => !successfulModels.includes(m));
      return [...successfulModels, ...otherModels].slice(0, 5); // Limit to 5 models
    }

    return provider.models.slice(0, 5);
  }

  isModelUnavailable(providerName, modelId) {
    return this.unavailableModels.has(`${providerName}/${modelId}`);
  }

  markModelUnavailable(providerName, modelId) {
    this.unavailableModels.add(`${providerName}/${modelId}`);
    this.warn(`🚫 ${providerName}/${modelId} is unavailable, skipping it from now on`);
  }

  /**
   * Update provider success tracking
   */
  updateProviderSuccess(providerName, modelId, success) {
    const status = this.providerStatus[providerName];

    if (success) {
      status.lastSuccess = Date.now();
      status.consecutiveFailures = 0;
      status.available = true;
      status.modelSuccesses[modelId] = (status.modelSuccesses[modelId] || 0) + 1;
    } else {
      status.lastFailure = Date.now();
      status.consecutiveFailures++;

      // Mark provider as temporarily unavailable after too many failures
      if (status.consecutiveFailures >= 3) {
        status.available = false;
        this.warn(`🚫 Marking ${providerName} as temporarily unavailable`);
      }
    }
  }

  /**
   * Check if error indicates we should skip remaining models for this provider
   */
  shouldSkipProvider(error) {
    const status = error?.status;
    return (
      FALLBACK_ERRORS.RATE_LIMITED.includes(status) ||
      FALLBACK_ERRORS.QUOTA_EXCEEDED.includes(status)
    );
  }

  /**
   * Check if error indicates we shouldn't retry
   */
  shouldNotRetry(error) {
    const status = error?.status;
    return (
      FALLBACK_ERRORS.RATE_LIMITED.includes(status) ||
      FALLBACK_ERRORS.QUOTA_EXCEEDED.includes(status) ||
      FALLBACK_ERRORS.UNAUTHORIZED.includes(status) ||
      FALLBACK_ERRORS.BAD_REQUEST.includes(status) ||
      FALLBACK_ERRORS.MODEL_UNAVAILABLE.includes(status)
    );
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current status for debugging
   */
  getStatus() {
    return {
      providers: this.providerPriority.map(name => ({
        name,
        available: this.providerStatus[name].available,
        hasApiKey: !!this.providers[name].getApiKey(),
        lastSuccess: this.providerStatus[name].lastSuccess,
        consecutiveFailures: this.providerStatus[name].consecutiveFailures,
      })),
    };
  }

  /**
   * Reset all provider statuses
   */
  reset() {
    for (const provider of this.providerPriority) {
      this.providerStatus[provider] = {
        available: true,
        lastSuccess: null,
        lastFailure: null,
        consecutiveFailures: 0,
        modelSuccesses: {},
      };
    }
    this.unavailableModels.clear();
    this.log("🔄 Reset all provider statuses");
  }
}

// Create singleton instance
const aiManager = new MultiProviderAIManager();

// Export for module usage
export { MultiProviderAIManager };
export default aiManager;

// Make available globally for browser usage
if (typeof window !== "undefined") {
  window.MultiProviderAIManager = MultiProviderAIManager;
  window.aiManager = aiManager;
}
