/**
 * Multi-Provider AI Configuration
 * Browser-compatible configuration for AI providers
 */

// Environment configuration (these need to be bundled or injected at build time)
// For static sites, we read from window._env or use defaults
const getEnvVar = (key, defaultValue = '') => {
  if (typeof window !== 'undefined' && window._env && window._env[key]) {
    return window._env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return defaultValue;
};

export const AI_PROVIDERS = {
  pollinations: {
    name: 'Pollinations',
    baseURL: 'https://gen.pollinations.ai',
    endpoint: '/v1/chat/completions',
    getApiKey: () => getEnvVar('POLLINATIONS_API_KEY'),
    requiresAuth: false, // Works without auth but benefits from it
    defaultModel: 'openai',
    // Models ordered by quality/reliability based on testing
    models: [
      'openai',        // GPT-4o Mini (primary)
      'openai-fast',   // GPT-4.1 Nano
      'openai-large',  // GPT-4o
      'mistral',       // Mistral Small 3.1 24B
      'gemini-fast',   // Gemini 2.0 Flash (via Pollinations)
      'gemini',        // Gemini 2.5 Flash
      'llamascout',    // Llama 4 Scout 17B
      'llama-roblox',  // Llama 3.1 8B
      'phi',           // Phi-4 Mini
    ],
    formatRequest: (messages, options = {}) => ({
      model: options.model || 'openai',
      messages,
      response_format: options.json ? { type: 'json_object' } : undefined,
      temperature: options.temperature ?? 0.5,
      max_tokens: options.max_tokens,
      referrer: getEnvVar('REFERRER_ID', 'dseeker.github.io'),
    }),
    parseResponse: (data) => ({
      content: data.choices?.[0]?.message?.content || '',
      model: data.model,
      usage: data.usage,
      provider: 'pollinations',
    }),
  },

  openrouter: {
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    endpoint: '/chat/completions',
    getApiKey: () => getEnvVar('OPENROUTER_API_KEY'),
    requiresAuth: true,
    defaultModel: 'meta-llama/llama-3.3-8b-instruct:free',
    // Free models on OpenRouter
    models: [
      'meta-llama/llama-3.3-8b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
      'google/gemma-2-9b-it:free',
      'qwen/qwen-2.5-72b-instruct:free',
      'microsoft/phi-4:free',
    ],
    formatRequest: (messages, options = {}) => ({
      model: options.model || 'meta-llama/llama-3.3-8b-instruct:free',
      messages,
      temperature: options.temperature ?? 0.5,
      max_tokens: options.max_tokens || 4096,
    }),
    parseResponse: (data) => ({
      content: data.choices?.[0]?.message?.content || '',
      model: data.model,
      usage: data.usage,
      provider: 'openrouter',
    }),
    extraHeaders: {
      'HTTP-Referer': 'https://dseeker.github.io',
      'X-Title': 'ColorVerse',
    },
  },

  gemini: {
    name: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    endpoint: '/models/{model}:generateContent',
    getApiKey: () => getEnvVar('GOOGLE_GEMINI_API_KEY'),
    requiresAuth: true,
    authMethod: 'query', // Uses ?key= instead of Authorization header
    defaultModel: 'gemini-2.0-flash',
    models: [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ],
    formatRequest: (messages, options = {}) => {
      // Convert OpenAI format to Gemini format
      const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      // Add system instruction if present
      const systemMessage = messages.find(m => m.role === 'system');

      return {
        contents,
        systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
        generationConfig: {
          temperature: options.temperature ?? 0.5,
          maxOutputTokens: options.max_tokens || 4096,
        },
      };
    },
    parseResponse: (data) => ({
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      model: 'gemini',
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0,
      },
      provider: 'gemini',
    }),
  },
};

// Provider priority order for fallback
export const PROVIDER_PRIORITY = ['pollinations', 'openrouter', 'gemini'];

// Error types that trigger immediate fallback
export const FALLBACK_ERRORS = {
  RATE_LIMITED: [429],
  QUOTA_EXCEEDED: [403],
  UNAUTHORIZED: [401],
  SERVER_ERROR: [500, 502, 503, 504],
};

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  backoffDelays: [10000, 30000, 60000], // 10s, 30s, 60s
  modelFallbackDelay: 2000,
  providerFallbackDelay: 5000,
};

export default AI_PROVIDERS;
