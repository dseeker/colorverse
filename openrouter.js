const openrouter = {
  apiKey: null,
  client: null,

  initialize: function (apiKey) {
    this.apiKey = apiKey;
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true,
    });
  },

  generateImage: async function (prompt) {
    if (!this.client) {
      throw new Error("OpenRouter client not initialized. Please call initialize() first.");
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: "anthropic/claude-3.5-sonnet", // Or any other Claude model
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });
      return completion.choices[0].message.content;
    } catch (error) {
      console.error("Error generating image with OpenRouter:", error);
      throw error;
    }
  },
};
