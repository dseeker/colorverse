export const getEnvConfig = () => {
  return {
    isDevelopment: process.env.NODE_ENV !== "production",
    isTesting: process.env.VITEST_ENV === "test",
    apiBaseUrl: process.env.POLLINATIONS_API_URL || "https://gen.pollinations.ai",
    textApiUrl: process.env.POLLINATIONS_TEXT_URL || "https://gen.pollinations.ai/v1",
    referrerId: process.env.REFERRER_ID || "dseeker.github.io",
    shouldMockApi: process.env.API_MOCKING === "true",
  };
};

export const getTestUrl = (path: string) => {
  const { isDevelopment, isTesting } = getEnvConfig();

  if (isTesting) {
    return path;
  }

  if (isDevelopment) {
    return `http://localhost:3000${path}`;
  }

  return `https://your-production-site.com${path}`;
};
