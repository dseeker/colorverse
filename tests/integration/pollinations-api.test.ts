import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";

const API_KEY = process.env.POLLINATIONS_API_KEY || "test-key";
const USE_REAL_API = process.env.POLLINATIONS_LIVE_TEST === "true";

describe("Pollinations API Integration Tests", () => {
  beforeAll(() => {
    if (USE_REAL_API && !process.env.POLLINATIONS_API_KEY) {
      throw new Error("POLLINATIONS_LIVE_TEST requires POLLINATIONS_API_KEY");
    }
  });

  beforeEach(() => {
    if (USE_REAL_API) return;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        const url = new URL(input);
        const headers = new Headers(init?.headers);
        if (url.pathname.startsWith("/image/")) {
          return new Response(new Uint8Array([137, 80, 78, 71]), {
            status: 200,
            headers: { "Content-Type": "image/png" },
          });
        }
        if (!headers.has("Authorization")) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ message: "test" }) } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
  describe("Image Generation API", () => {
    it("should generate an image with authentication", async () => {
      const prompt = "a simple cat";
      const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=100&height=100&referrer=dseeker.github.io`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          Referer: "https://dseeker.github.io",
        },
      });

      expect(response.status).toBe(200);

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        expect(contentType).toMatch(/image\/(jpeg|png|webp)/);
      }
    }, 120000);

    it("should return image with referrer (anonymous tier)", async () => {
      const prompt = "a simple cat";
      const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=100&height=100&referrer=dseeker.github.io`;

      const response = await fetch(url, {
        headers: {
          Referer: "https://dseeker.github.io",
        },
      });

      console.log("Referrer test - Response status:", response.status);

      // Anonymous access depends on the provider's current tier policy.
      expect([200, 401, 429]).toContain(response.status);
    }, 30000);

    it("should accept query parameter authentication", async () => {
      const prompt = "a simple dog";
      const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=100&height=100&key=${API_KEY}&referrer=dseeker.github.io`;

      const response = await fetch(url);

      expect(response.status).toBe(200);
    }, 60000);

    it("should handle model parameter correctly", async () => {
      const prompt = "a simple house";
      const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=flux&width=100&height=100`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      });

      expect(response.status).toBe(200);
    }, 60000);

    it("should handle seed parameter for reproducible images", async () => {
      const prompt = "a simple tree";
      const seed = 12345;
      const url1 = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?seed=${seed}&width=100&height=100&referrer=dseeker.github.io`;
      const url2 = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?seed=${seed}&width=100&height=100&referrer=dseeker.github.io`;

      const response1 = await fetch(url1, {
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      const response2 = await fetch(url2, {
        headers: { Authorization: `Bearer ${API_KEY}` },
      });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    }, 60000);
  });

  describe("Text Generation API", () => {
    it("should generate text with authentication", async () => {
      const url = "https://gen.pollinations.ai/v1/chat/completions";

      const payload = {
        model: "openai",
        messages: [
          {
            role: "user",
            content: "Say 'Hello World'",
          },
        ],
        temperature: 0.5,
        referrer: "dseeker.github.io",
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);

      if (response.ok) {
        const result = await response.json();
        expect(result.choices).toBeDefined();
        expect(result.choices[0].message.content).toBeDefined();
      }
    }, 120000);

    it("should return 401 without authentication", async () => {
      const url = "https://gen.pollinations.ai/v1/chat/completions";

      const payload = {
        model: "openai",
        messages: [
          {
            role: "user",
            content: "Hello",
          },
        ],
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("401 test - Response status:", response.status);
      console.log("401 test - Response ok:", response.ok);
      console.log("401 test - Response headers:", response.headers);

      console.log("401 test - Response status:", response.status);
      console.log("401 test - Response ok:", response.ok);

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    }, 30000);

    it("should generate JSON response", async () => {
      const url = "https://gen.pollinations.ai/v1/chat/completions";

      const payload = {
        model: "openai",
        messages: [
          {
            role: "system",
            content: "You are a JSON generator. Output only JSON.",
          },
          {
            role: "user",
            content: "Generate a JSON object with a 'message' field saying 'test'",
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);

      if (response.ok) {
        const result = await response.json();
        const content = result.choices[0].message.content;

        expect(() => JSON.parse(content)).not.toThrow();
        const parsed = JSON.parse(content);
        expect(parsed.message).toBeDefined();
      }
    }, 120000);

    it("should handle different models", async () => {
      const url = "https://gen.pollinations.ai/v1/chat/completions";

      const payload = {
        model: "openai-large",
        messages: [
          {
            role: "user",
            content: "Say 'OK'",
          },
        ],
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
    }, 120000);
  });
});
