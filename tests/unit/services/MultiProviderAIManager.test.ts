import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MultiProviderAIManager } from "../../../src/services/MultiProviderAIManager.js";
import AI_PROVIDERS, { isUnavailableModelError } from "../../../src/services/aiProviderConfig.js";

function jsonResponse(status: number, body: unknown) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
    json: async () => JSON.parse(text),
  };
}

const messages = [{ role: "user", content: "expand animals" }];

interface ProviderError extends Error {
  provider: string;
  model: string;
  status?: number;
}

interface AggregateProviderError extends Error {
  causes: ProviderError[];
}

function isAggregateProviderError(value: unknown): value is AggregateProviderError {
  return value instanceof Error && Array.isArray(Reflect.get(value, "causes"));
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

describe("MultiProviderAIManager model availability", () => {
  let manager: MultiProviderAIManager;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    Object.assign(window, {
      _env: { OPENROUTER_API_KEY: "test-key", GOOGLE_GEMINI_API_KEY: "test-key" },
    });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    manager = new MultiProviderAIManager({
      providerPriority: ["openrouter", "gemini"],
      debug: false,
    });
    manager.sleep = () => Promise.resolve();
  });

  afterEach(() => {
    Reflect.deleteProperty(window, "_env");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not configure retired models", () => {
    const configured = Object.values(AI_PROVIDERS).flatMap(provider => [
      provider.defaultModel,
      ...provider.models,
    ]);
    expect(configured).not.toContain("meta-llama/llama-3.3-8b-instruct:free");
    expect(
      configured.filter((m: string) => m.startsWith("gemini-2.0") || m.startsWith("gemini-1.5"))
    ).toEqual([]);
  });

  it("classifies retired-model responses", () => {
    expect(isUnavailableModelError(404, "is no longer available")).toBe(true);
    expect(isUnavailableModelError(400, "Model not found")).toBe(true);
    expect(isUnavailableModelError(400, "Invalid JSON payload")).toBe(false);
    expect(isUnavailableModelError(502, "Upstream error")).toBe(false);
  });

  it("does not retry or re-request a model reported as no longer available", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("openrouter")
        ? jsonResponse(404, '{"error":{"message":"openrouter/free is no longer available"}}')
        : jsonResponse(200, { candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] })
    );

    await manager.createChatCompletion(messages);
    await manager.createChatCompletion(messages);

    const openRouterCalls = fetchMock.mock.calls.filter(([url]) => url.includes("openrouter"));
    expect(openRouterCalls).toHaveLength(1);
  });

  it("rejects with every underlying error instead of returning empty content", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("openrouter")
        ? jsonResponse(200, { choices: [{ message: { content: "" } }] })
        : jsonResponse(400, '{"error":{"message":"Invalid JSON payload received."}}')
    );

    const error = await rejectionOf(manager.createChatCompletion(messages));

    expect(error.message).toMatch(/^All AI providers failed/);
    expect(error.causes.map(cause => cause.message)).toEqual([
      expect.stringMatching(/openrouter\/openrouter\/free returned an empty response/),
      expect.stringMatching(/gemini\/gemini-3.6-flash API Error 400/),
      expect.stringMatching(/gemini\/gemini-3.5-flash-lite API Error 400/),
    ]);
    // 400 is not retried: one request per Gemini model
    expect(fetchMock.mock.calls.filter(([url]) => url.includes("generativelanguage"))).toHaveLength(
      2
    );
  });
});
