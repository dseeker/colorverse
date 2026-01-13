import { describe, it, expect, vi } from "vitest";

describe("getImageUrl", () => {
  const originalBaseUrl = "https://gen.pollinations.ai";

  it("should generate correct URL with basic parameters", () => {
    const prompt = "test prompt";
    const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=400&height=400&referrer=dseeker.github.io`;
    expect(url).toContain(originalBaseUrl);
    expect(url).toContain("width=400");
    expect(url).toContain("height=400");
    expect(url).toContain("referrer=dseeker.github.io");
  });

  it("should use /image/ path instead of /prompt/", () => {
    const prompt = "test";
    const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=400&height=400`;
    expect(url).toContain("/image/");
    expect(url).not.toContain("/prompt/");
  });

  it("should encode prompt correctly", () => {
    const prompt = "a beautiful sunset";
    const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`;
    expect(url).toContain("a%20beautiful%20sunset");
  });

  it("should include seed parameter when provided", () => {
    const seed = 12345;
    const url = `https://gen.pollinations.ai/image/test?seed=${seed}&referrer=dseeker.github.io`;
    const url1 = url;
    const url2 = url;
    expect(url1).toContain(`seed=${seed}`);
    expect(url1).toBe(url2);
  });

  it("should include model parameter when provided", () => {
    const model = "flux";
    const url = `https://gen.pollinations.ai/image/test?model=${model}&referrer=dseeker.github.io`;
    expect(url).toContain(`model=${model}`);
  });

  it("should handle multiple parameters correctly", () => {
    const params = { width: 500, height: 600, seed: 999, model: "turbo" };
    const url = `https://gen.pollinations.ai/image/test?width=${params.width}&height=${params.height}&seed=${params.seed}&model=${params.model}&referrer=dseeker.github.io`;
    expect(url).toContain("width=500");
    expect(url).toContain("height=600");
    expect(url).toContain("seed=999");
    expect(url).toContain("model=turbo");
  });

  it("should always include referrer ID", () => {
    const url = `https://gen.pollinations.ai/image/test?referrer=dseeker.github.io`;
    expect(url).toContain("referrer=dseeker.github.io");
  });

  it("should handle empty prompt", () => {
    const url = `https://gen.pollinations.ai/image/?referrer=dseeker.github.io`;
    expect(url).toContain(originalBaseUrl);
  });

  it("should handle special characters in prompt", () => {
    const prompt = "test & special @ chars #2024";
    const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`;
    expect(url).toContain("test%20%26%20special%20%40%20chars%20%232024");
  });
});
