/**
 * Multi-Provider AI Configuration
 * Browser-compatible configuration for AI providers
 */

// Environment configuration (these need to be bundled or injected at build time)
// For static sites, we read from window._env or use defaults
const getEnvVar = (key, defaultValue = "") => {
  if (typeof window !== "undefined" && window._env && window._env[key]) {
    return window._env[key];
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  return defaultValue;
};

export const AI_PROVIDERS = {
  pollinations: {
    name: "Pollinations",
    baseURL: "https://gen.pollinations.ai",
    endpoint: "/v1/chat/completions",
    getApiKey: () => getEnvVar("POLLINATIONS_API_KEY"),
    requiresAuth: false, // Works without auth but benefits from it
    defaultModel: "openai",
    // Free (non paid_only) aliases listed in https://gen.pollinations.ai/text/models (2026-10-31)
    models: ["openai", "openai-fast", "gpt-oss", "deepseek", "kimi"],
    formatRequest: (messages, options = {}) => ({
      model: options.model || "openai",
      messages,
      response_format: options.json ? { type: "json_object" } : undefined,
      temperature: options.temperature ?? 0.5,
      max_tokens: options.max_tokens,
      referrer: getEnvVar("REFERRER_ID", "dseeker.github.io"),
    }),
    parseResponse: data => ({
      content: data.choices?.[0]?.message?.content || "",
      model: data.model,
      usage: data.usage,
      provider: "pollinations",
    }),
  },

  openrouter: {
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    endpoint: "/chat/completions",
    getApiKey: () => getEnvVar("OPENROUTER_API_KEY"),
    requiresAuth: true,
    // Individual ":free" ids rotate and get retired (e.g. llama-3.3-8b-instruct:free
    // now returns 404); the free router always targets a live free model.
    defaultModel: "openrouter/free",
    models: ["openrouter/free"],
    formatRequest: (messages, options = {}) => ({
      model: options.model || "openrouter/free",
      messages,
      response_format: options.json ? { type: "json_object" } : undefined,
      temperature: options.temperature ?? 0.5,
      max_tokens: options.max_tokens,
    }),
    parseResponse: data => ({
      content: data.choices?.[0]?.message?.content || "",
      model: data.model,
      usage: data.usage,
      provider: "openrouter",
    }),
    extraHeaders: {
      "HTTP-Referer": "https://dseeker.github.io",
      "X-Title": "ColorVerse",
    },
  },

  gemini: {
    name: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
    endpoint: "/models/{model}:generateContent",
    getApiKey: () => getEnvVar("GOOGLE_GEMINI_API_KEY"),
    requiresAuth: true,
    authMethod: "query", // Uses ?key= instead of Authorization header
    // gemini-2.0-flash and gemini-1.5-* are shut down; these have no announced
    // shutdown date per https://ai.google.dev/gemini-api/docs/deprecations (2026-10-31)
    defaultModel: "gemini-3.6-flash",
    models: ["gemini-3.6-flash", "gemini-3.5-flash-lite"],
    formatRequest: (messages, options = {}) => {
      // Convert OpenAI format to Gemini format
      const contents = messages
        .filter(m => m.role !== "system")
        .map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

      // Add system instruction if present
      const systemMessage = messages.find(m => m.role === "system");

      return {
        contents,
        systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
        generationConfig: {
          temperature: options.temperature ?? 0.5,
          maxOutputTokens: options.max_tokens || 4096,
        },
      };
    },
    parseResponse: data => ({
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
      model: "gemini",
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0,
      },
      provider: "gemini",
    }),
  },
};

// Provider priority order for fallback
export const PROVIDER_PRIORITY = ["pollinations", "openrouter", "gemini"];

// Error types that trigger immediate fallback
export const FALLBACK_ERRORS = {
  RATE_LIMITED: [429],
  QUOTA_EXCEEDED: [402, 403],
  UNAUTHORIZED: [401],
  BAD_REQUEST: [400, 422],
  MODEL_UNAVAILABLE: [404, 410],
  SERVER_ERROR: [500, 502, 503, 504],
};

const UNAVAILABLE_MODEL_PATTERN =
  /no longer available|not a valid model|invalid model|unknown model|model[^.]{0,60}(?:not found|does not exist|not supported|deprecated|retired|unavailable)|no endpoints found/i;

// True when the provider reports the requested model as retired or unknown.
export function isUnavailableModelError(status, detail = "") {
  if (FALLBACK_ERRORS.MODEL_UNAVAILABLE.includes(status)) {
    return true;
  }
  return FALLBACK_ERRORS.BAD_REQUEST.includes(status) && UNAVAILABLE_MODEL_PATTERN.test(detail);
}

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  backoffDelays: [10000, 30000, 60000], // 10s, 30s, 60s
  modelFallbackDelay: 2000,
  providerFallbackDelay: 5000,
};

export default AI_PROVIDERS;
