import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const CONTENT_API_URL = "https://content-api.example.test/";
const POLLINATIONS_CATALOG_URL = "https://gen.pollinations.ai/text/models";
const OPENROUTER_CATALOG_URL = "https://openrouter.ai/api/v1/models";
const RETIRED_OPENROUTER_MODEL = "meta-llama/llama-3.3-8b-instruct:free";
const scriptSource = readFileSync(
  resolve(__dirname, "../../../src/modules/aiProviders.js"),
  "utf8"
);

type ProviderName = "pollinations" | "openrouter" | "gemini";

interface ProviderError extends Error {
  provider: ProviderName;
  model: string | null;
  status: number | null;
  modelUnavailable: boolean;
}

interface AggregateProviderError extends Error {
  causes: ProviderError[];
}

interface ProviderStatus {
  available: boolean;
  lastFailure: number | null;
  consecutiveFailures: number;
}

// Globals exposed by the classic script src/modules/aiProviders.js.
interface AiProvidersApi {
  AI_PROVIDERS: Record<ProviderName, { models: string[] }>;
  providerStatusTracker: Record<ProviderName, ProviderStatus>;
  callAIAPI(prompt: string, preferredModel?: string): Promise<unknown>;
  callOpenRouterAPI(prompt: string): Promise<unknown>;
  callGeminiAPI(prompt: string): Promise<unknown>;
  resolveProviderModels(provider: ProviderName, preferredModel?: string | null): Promise<string[]>;
  isUnavailableModelError(status: number, detail?: string): boolean;
  getAvailableProviders(): ProviderName[];
}

// content-api proxy contract: chat providers carry the model in the body,
// Gemini carries it at the top level.
type ProxyPayload =
  | { provider: "pollinations" | "openrouter"; body: { model: string } }
  | { provider: "gemini"; model: string; body: Record<string, unknown> };

interface ProxyReply {
  status: number;
  body?: unknown;
  bodyReadError?: Error;
}

type ProxyHandler = (payload: ProxyPayload) => ProxyReply;

interface FetchInit {
  method?: string;
  body?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseProxyPayload(raw: string | undefined): ProxyPayload {
  const payload: unknown = JSON.parse(raw ?? "null");
  if (!isRecord(payload) || !isRecord(payload.body)) {
    throw new Error(`Malformed proxy payload: ${raw}`);
  }
  const { provider, body } = payload;
  if (provider === "gemini" && typeof payload.model === "string") {
    return { provider, model: payload.model, body };
  }
  if (
    (provider === "pollinations" || provider === "openrouter") &&
    typeof body.model === "string"
  ) {
    return { provider, body: { ...body, model: body.model } };
  }
  throw new Error(`Malformed ${String(provider)} proxy payload: ${raw}`);
}

function isAggregateProviderError(value: unknown): value is AggregateProviderError {
  return isRecord(value) && typeof value.message === "string" && Array.isArray(value.causes);
}

async function rejectionOf(promise: Promise<unknown>): Promise<AggregateProviderError> {
  const outcome = await promise.then(
    () => undefined,
    (error: unknown) => error
  );
  if (!isAggregateProviderError(outcome)) {
    throw new Error("Expected rejection with an aggregated provider error");
  }
  return outcome;
}

// Shapes mirror the public catalogs (trimmed to the fields the module reads).
const pollinationsCatalog = [
  {
    name: "openai/gpt-5.4-nano",
    aliases: ["openai"],
    paid_only: false,
    output_modalities: ["text"],
    supported_parameters: ["response_format"],
    health: { status: "healthy" },
  },
  {
    name: "openai/gpt-5-nano",
    aliases: ["openai-fast"],
    paid_only: false,
    output_modalities: ["text"],
    supported_parameters: ["response_format"],
    health: { status: "healthy" },
  },
  {
    name: "openai/gpt-5.5",
    aliases: ["openai-large"],
    paid_only: false,
    output_modalities: ["text"],
    supported_parameters: ["response_format"],
  },
  {
    name: "mistralai/mistral-small-4",
    aliases: ["mistral"],
    paid_only: true,
    output_modalities: ["text"],
    supported_parameters: ["response_format"],
  },
];

// OpenRouter /api/v1/models pricing: USD-per-unit decimal strings.
const FREE_PRICING = {
  prompt: "0",
  completion: "0",
  request: "0",
  image: "0",
  web_search: "0",
  internal_reasoning: "0",
};

const openRouterCatalog = {
  data: [
    {
      id: "google/gemma-4-31b-it:free",
      pricing: FREE_PRICING,
      architecture: { output_modalities: ["text"] },
      supported_parameters: ["response_format", "temperature"],
    },
    {
      id: "falsely/advertised:free",
      pricing: { prompt: "0", completion: "0.0000004" },
      architecture: { output_modalities: ["text"] },
      supported_parameters: ["response_format"],
    },
    {
      id: "unpriced/model:free",
      architecture: { output_modalities: ["text"] },
      supported_parameters: ["response_format"],
    },
    {
      id: "vision/only-image:free",
      pricing: FREE_PRICING,
      architecture: { output_modalities: ["image"] },
      supported_parameters: ["response_format"],
    },
    {
      id: "openai/gpt-4.1-nano",
      pricing: { prompt: "0.0000001", completion: "0.0000004" },
      supported_parameters: ["response_format"],
    },
  ],
};

function mockResponse({ status, body, bodyReadError }: ProxyReply) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => {
      if (bodyReadError) {
        throw bodyReadError;
      }
      return text;
    },
    json: async (): Promise<unknown> => JSON.parse(text),
  };
}

function chatCompletion(content: unknown) {
  return { choices: [{ message: { content: JSON.stringify(content) } }] };
}

function geminiCompletion(content: unknown) {
  return { candidates: [{ content: { parts: [{ text: JSON.stringify(content) }] } }] };
}

const failingProxy: ProxyHandler = () => ({ status: 500, body: "" });

function loadModule({
  proxyHandler = failingProxy,
  catalogs = {
    [POLLINATIONS_CATALOG_URL]: pollinationsCatalog,
    [OPENROUTER_CATALOG_URL]: openRouterCatalog,
  },
}: {
  proxyHandler?: ProxyHandler;
  catalogs?: Record<string, unknown>;
} = {}) {
  const proxyCalls: ProxyPayload[] = [];
  const catalogCalls: string[] = [];

  const fetch = vi.fn(async (url: string, init: FetchInit = {}) => {
    if (init.method === "GET") {
      catalogCalls.push(url);
      if (!(url in catalogs)) {
        throw new TypeError("Failed to fetch");
      }
      return mockResponse({ status: 200, body: catalogs[url] });
    }
    if (url !== CONTENT_API_URL) {
      throw new Error(`Unexpected POST to ${url}`);
    }
    const payload = parseProxyPayload(init.body);
    proxyCalls.push(payload);
    return mockResponse(proxyHandler(payload));
  });

  const sandbox = vm.createContext({
    window: { _env: { CONTENT_API_URL } },
    fetch,
    debug: { log: () => {} },
    REFERRER_ID: "test-referrer",
    showToast: vi.fn(),
    console: { log: () => {}, warn: () => {}, error: () => {} },
    // Run fallback delays immediately so tests stay fast and deterministic.
    setTimeout: (fn: () => void) => {
      void Promise.resolve().then(fn);
      return 0;
    },
    clearTimeout: () => {},
    AbortController,
  });
  const api: AiProvidersApi = vm.runInContext(
    `${scriptSource}
;({ AI_PROVIDERS, callAIAPI, callOpenRouterAPI, callGeminiAPI, resolveProviderModels,
    isUnavailableModelError, getAvailableProviders, providerStatusTracker })`,
    sandbox
  );

  return { api, proxyCalls, catalogCalls };
}

function modelsCalled(calls: ProxyPayload[], provider: ProviderName): string[] {
  return calls.flatMap(call => {
    if (call.provider !== provider) {
      return [];
    }
    return call.provider === "gemini" ? [call.model] : [call.body.model];
  });
}

describe("aiProviders model configuration", () => {
  it("does not configure retired fallback models", () => {
    const { api } = loadModule();
    const configured = Object.values(api.AI_PROVIDERS).flatMap(provider => provider.models);

    expect(configured).not.toContain(RETIRED_OPENROUTER_MODEL);
    expect(configured).not.toContain("gemini-2.0-flash");
    expect(configured).not.toContain("gemini-1.5-flash");
    expect(configured.some(model => model.endsWith(":free"))).toBe(false);
  });

  it.each([
    [
      404,
      '{"error":{"message":"meta-llama/llama-3.3-8b-instruct:free is no longer available"}}',
      true,
    ],
    [410, "gone", true],
    [400, '{"error":{"message":"Model not found: llamascout"}}', true],
    [400, '{"error":{"message":"Invalid JSON payload received. Unknown name \\"model\\""}}', false],
    [502, '{"error":"Upstream error: The operation was aborted"}', false],
    [429, "rate limited", false],
  ])("classifies status %i (%s) as unavailable=%s", (status, detail, expected) => {
    const { api } = loadModule();
    expect(api.isUnavailableModelError(status, detail)).toBe(expected);
  });
});

describe("aiProviders model discovery", () => {
  it("drops Pollinations candidates that the public catalog does not list or marks paid-only", async () => {
    const { api, catalogCalls } = loadModule();

    const models = await api.resolveProviderModels("pollinations", "openai-large");

    expect(models).toEqual(["openai-large", "openai", "openai-fast"]);
    expect(catalogCalls).toEqual([POLLINATIONS_CATALOG_URL]);
  });

  it("adds only zero-priced :free text models to the OpenRouter free router", async () => {
    const { api } = loadModule();

    const models = await api.resolveProviderModels("openrouter");

    expect(models).toEqual(["openrouter/free", "google/gemma-4-31b-it:free"]);
  });

  it("falls back to configured models when a catalog cannot be fetched", async () => {
    const { api } = loadModule({ catalogs: {} });

    expect(await api.resolveProviderModels("openrouter")).toEqual(["openrouter/free"]);
    expect(await api.resolveProviderModels("pollinations")).toEqual(
      api.AI_PROVIDERS.pollinations.models
    );
  });

  it("fetches each catalog once for concurrent callers", async () => {
    const { api, catalogCalls } = loadModule();

    await Promise.all([
      api.resolveProviderModels("openrouter"),
      api.resolveProviderModels("openrouter"),
    ]);

    expect(catalogCalls).toEqual([OPENROUTER_CATALOG_URL]);
  });
});

describe("aiProviders fallback and failure handling", () => {
  let categoryData: Record<string, unknown>;

  beforeEach(() => {
    categoryData = { title: "Animal Kingdom", items: { animals_item_1: { title: "Eagle" } } };
  });

  it("skips a model reported as no longer available and never requests it again", async () => {
    const { api, proxyCalls } = loadModule({
      proxyHandler: payload => {
        if (payload.provider === "pollinations") {
          return { status: 502, body: '{"error":"Upstream error"}' };
        }
        if (payload.provider === "openrouter" && payload.body.model === "openrouter/free") {
          return {
            status: 404,
            body: '{"error":{"message":"openrouter/free is no longer available","code":404}}',
          };
        }
        return { status: 200, body: chatCompletion(categoryData) };
      },
    });

    await expect(api.callAIAPI("expand animals")).resolves.toEqual(categoryData);
    await expect(api.callAIAPI("expand fantasy")).resolves.toEqual(categoryData);

    expect(modelsCalled(proxyCalls, "openrouter")).toEqual([
      "openrouter/free",
      "google/gemma-4-31b-it:free",
      "google/gemma-4-31b-it:free",
    ]);
  });

  it("sends the Gemini model at the proxy top level, not inside the Gemini body", async () => {
    const { api, proxyCalls } = loadModule({
      proxyHandler: () => ({ status: 200, body: geminiCompletion(categoryData) }),
    });

    await expect(api.callGeminiAPI("expand animals")).resolves.toEqual(categoryData);

    expect(proxyCalls[0]).toMatchObject({ provider: "gemini", model: "gemini-3.6-flash" });
    expect(proxyCalls[0].body).not.toHaveProperty("model");
  });

  it("rejects with every attempt when all providers fail instead of returning content", async () => {
    const { api } = loadModule({
      proxyHandler: ({ provider }) =>
        provider === "openrouter"
          ? { status: 404, body: '{"error":{"message":"No endpoints found for model"}}' }
          : { status: 400, body: '{"error":{"message":"Invalid JSON payload received."}}' },
    });

    const error = await rejectionOf(api.callAIAPI("expand animals"));

    expect(error.message).toMatch(/^All AI providers failed to generate content/);
    expect(error.causes.map(cause => `${cause.provider}:${cause.status}`)).toEqual([
      "pollinations:400",
      "pollinations:400",
      "openrouter:404",
      "openrouter:404",
      "gemini:400",
      "gemini:400",
    ]);
  });

  it("keeps an explicit detail when an error response body cannot be read", async () => {
    const { api } = loadModule({
      proxyHandler: () => ({ status: 502, bodyReadError: new Error("stream aborted") }),
      catalogs: {},
    });

    const error = await rejectionOf(api.callGeminiAPI("expand animals"));

    expect(error.causes[0].message).toBe(
      "gemini/gemini-3.6-flash API Error 502: (error body could not be read: stream aborted)"
    );
  });

  it("treats a 200 response without a JSON object as a failure", async () => {
    const { api } = loadModule({
      proxyHandler: () => ({
        status: 200,
        body: { choices: [{ message: { content: "Sorry!" } }] },
      }),
    });

    await expect(api.callOpenRouterAPI("expand animals")).rejects.toThrow(
      /did not contain a JSON object/
    );
  });

  it.each([
    ["an array", [{ type: "text", text: "{}" }], "array"],
    ["an object", { title: "Eagle" }, "object"],
    ["null", null, "null"],
  ])("rejects message content that is %s with a provider error", async (_label, content, kind) => {
    const { api } = loadModule({
      proxyHandler: () => ({ status: 200, body: { choices: [{ message: { content } }] } }),
      catalogs: {},
    });

    const error = await rejectionOf(api.callOpenRouterAPI("expand animals"));

    expect(error.causes).toHaveLength(1);
    expect(error.causes[0]).toMatchObject({ provider: "openrouter", model: "openrouter/free" });
    expect(error.causes[0].message).toBe(
      `openrouter/openrouter/free: response content was ${kind}, expected a JSON string`
    );
  });

  it("stops trying further models of a provider that is not configured in the Worker", async () => {
    const { api, proxyCalls } = loadModule({
      proxyHandler: ({ provider }) =>
        provider === "openrouter"
          ? { status: 503, body: '{"error":"OpenRouter API key not configured"}' }
          : { status: 200, body: geminiCompletion(categoryData) },
      catalogs: {},
    });
    api.providerStatusTracker.pollinations.available = false;
    api.providerStatusTracker.pollinations.lastFailure = Date.now();

    await expect(api.callAIAPI("expand animals")).resolves.toEqual(categoryData);
    expect(modelsCalled(proxyCalls, "openrouter")).toEqual(["openrouter/free"]);
    expect(modelsCalled(proxyCalls, "gemini")).toEqual(["gemini-3.6-flash"]);
  });

  it("stops POSTing to providers in cool-down across repeated category expansions", async () => {
    const { api, proxyCalls } = loadModule({
      proxyHandler: () => ({ status: 502, body: '{"error":"Upstream error"}' }),
      catalogs: {},
    });
    const categories = ["animals", "fantasy", "mandalas", "vehicles", "nature"];

    for (const category of categories) {
      await expect(api.callAIAPI(`expand ${category}`)).rejects.toThrow(/All AI providers failed/);
    }
    const callsAfterCoolDown = proxyCalls.length;
    await expect(api.callAIAPI("expand food")).rejects.toThrow(/no model was attempted/);

    expect(api.getAvailableProviders()).toEqual([]);
    expect(proxyCalls.length).toBe(callsAfterCoolDown);
  });
});
