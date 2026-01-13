# Pollinations.ai API Integration Guide (v3)

## API Key Setup

### Environment Configuration

1. Create a `.env` file in the project root (if not already exists)
2. Add the following line to the `.env` file:
   ```
   POLLINATIONS_API_KEY=pk_9sbL41ofRXSoaOC2
   ```

### Security Recommendations

- Never commit the `.env` file to version control
- Add `.env` to your `.gitignore`
- Use environment variable management for different deployment environments

## API Endpoints

### Image Generation

- **Endpoint:** `https://gen.pollinations.ai/image/{prompt}`
- **Method:** GET
- **Authentication:** Required (Bearer token or query parameter)
- **Default Model:** `flux`
- **Available Models:** `flux` (default), `turbo`, `gptimage`, `kontext`, `seedream`, `nanobanana`, `nanobanana-pro`

### Text Generation

- **Endpoint:** `https://gen.pollinations.ai/v1/chat/completions`
- **Method:** POST
- **Authentication:** Required (Bearer token only)
- **Format:** OpenAI-compatible

## Quick Start

### Image Generation

```bash
curl 'https://gen.pollinations.ai/image/a%20cat?model=flux' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

### Text Generation

```bash
curl 'https://gen.pollinations.ai/v1/chat/completions' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model": "openai", "messages": [{"role": "user", "content": "Hello"}]}'
```

### Vision (Image Input)

```bash
curl 'https://gen.pollinations.ai/v1/chat/completions' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model": "openai", "messages": [{"role": "user", "content": [{"type": "text", "text": "Describe this image"}, {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}}]}]}'
```

**Gemini Tools:** `gemini`, `gemini-fast`, `gemini-large` have `code_execution` enabled by default. `gemini-search` has `google_search` enabled. Pass your own `tools` array to override (e.g., `[{"type": "function", "function": {"name": "google_search"}}]`).

### Simple Text Endpoint

```bash
curl 'https://gen.pollinations.ai/text/hello?key=YOUR_API_KEY'
```

### Streaming

```bash
curl 'https://gen.pollinations.ai/v1/chat/completions' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model": "openai", "messages": [{"role": "user", "content": "Write a poem"}], "stream": true}' \
  --no-buffer
```

### Model Discovery

**Always check available models before testing:**

- **Image models:** [/image/models](https://gen.pollinations.ai/image/models)
- **Text models:** [/v1/models](https://gen.pollinations.ai/v1/models)

## Authentication

**Two key types:**

- **Publishable Keys (`pk_`):** Client-side safe, IP rate-limited (1 pollen/hour per IP+key)
- **Secret Keys (`sk_`):** Server-side only, no rate limits, can spend Pollen

**Auth methods:**

1. Header: `Authorization: Bearer YOUR_API_KEY`
2. Query param: `?key=YOUR_API_KEY`

## Implementation Example

### Backend Service (Node.js/Express)

```typescript
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

class PollinationsService {
  private apiKey: string;
  private baseImageUrl = "https://gen.pollinations.ai/image/";
  private baseTextUrl = "https://gen.pollinations.ai/v1/chat/completions";

  constructor() {
    this.apiKey = process.env.POLLINATIONS_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("Pollinations API Key is not configured");
    }
  }

  async generateImage(
    prompt: string,
    options: {
      model?: string;
      width?: number;
      height?: number;
      seed?: number;
    } = {}
  ) {
    try {
      const params = new URLSearchParams({
        ...(options.model && { model: options.model }),
        ...(options.width && { width: options.width.toString() }),
        ...(options.height && { height: options.height.toString() }),
        ...(options.seed && { seed: options.seed.toString() }),
      });

      const url = `${this.baseImageUrl}${encodeURIComponent(prompt)}${params.toString() ? `?${params}` : ""}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        responseType: "arraybuffer",
      });

      return response.data;
    } catch (error) {
      console.error("Pollinations Image Generation Error:", error);
      throw error;
    }
  }

  async generateText(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      responseFormat?: string;
    } = {}
  ) {
    try {
      const payload = {
        model: options.model || "openai",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        ...(options.temperature && { temperature: options.temperature }),
        ...(options.responseFormat && { response_format: { type: options.responseFormat } }),
      };

      const response = await axios.post(this.baseTextUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error("Pollinations Text Generation Error:", error);
      throw error;
    }
  }
}

export default new PollinationsService();
```

### Frontend Usage Example

```typescript
import PollinationsService from "./PollinationsService";

async function generateAIImage() {
  try {
    const imageResult = await PollinationsService.generateImage("A futuristic cityscape", {
      model: "flux",
      width: 1024,
      height: 1024,
    });

    // Handle image result
    console.log("Image generated successfully");
  } catch (error) {
    // Handle error
    console.error("Image generation failed", error);
  }
}

async function generateAIText() {
  try {
    const textResult = await PollinationsService.generateText(
      "Generate 5 creative gelato flavors",
      {
        model: "openai",
        temperature: 0.7,
        responseFormat: "json_object",
      }
    );

    const content = textResult.choices[0].message.content;
    const data = JSON.parse(content);
    console.log("Generated flavors:", data);
  } catch (error) {
    console.error("Text generation failed", error);
  }
}
```

## API Parameters

### Image API Parameters

| Parameter | Type    | Required | Default | Description                                                                            |
| --------- | ------- | -------- | ------- | -------------------------------------------------------------------------------------- |
| `prompt`  | string  | Yes      | -       | Text description of desired image                                                      |
| `model`   | string  | No       | `flux`  | AI model to use (flux, turbo, gptimage, kontext, seedream, nanobanana, nanobanana-pro) |
| `width`   | number  | No       | 1024    | Image width in pixels                                                                  |
| `height`  | number  | No       | 1024    | Image height in pixels                                                                 |
| `seed`    | number  | No       | random  | Integer seed for reproducible outputs                                                  |
| `nologo`  | boolean | No       | false   | Remove watermark/logo                                                                  |
| `private` | boolean | No       | false   | Private generation                                                                     |
| `safe`    | boolean | No       | false   | Enable content safety filters                                                          |

### Text API Parameters

| Parameter         | Type    | Required | Default  | Description                                    |
| ----------------- | ------- | -------- | -------- | ---------------------------------------------- |
| `model`           | string  | No       | `openai` | AI model to use                                |
| `messages`        | array   | Yes      | -        | Array of message objects with role and content |
| `temperature`     | number  | No       | 1.0      | Sampling temperature (0.0-2.0)                 |
| `response_format` | object  | No       | -        | `{ type: "json_object" }` for JSON output      |
| `stream`          | boolean | No       | false    | Enable streaming responses                     |

## Error Handling

### Common HTTP Status Codes

- **200 OK:** Request successful
- **400 Bad Request:** Invalid parameters or malformed request
- **401 Unauthorized:** Missing or invalid API key
- **429 Too Many Requests:** Rate limit exceeded
- **500 Internal Server Error:** API server error

### Example Error Response

```json
{
  "status": 401,
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You need to authenticate by providing a session cookie or Authorization header (Bearer token).",
    "timestamp": "2025-01-13T00:00:00.000Z",
    "details": {
      "name": "UnauthorizedError",
      "stack": ""
    },
    "requestId": "abc123"
  }
}
```

## Token Management Best Practices

1. Rotate tokens periodically
2. Implement token validation
3. Use least privilege principle
4. Monitor and log API usage
5. Handle rate limits gracefully with exponential backoff
6. Implement proper error handling and user feedback

## Rate Limits

- **Publishable Keys (`pk_`):** 1 pollen/hour per IP+key
- **Secret Keys (`sk_`):** No rate limits, can spend Pollen

## Troubleshooting

- Ensure `.env` file is correctly configured with `POLLINATIONS_API_KEY`
- Check network connectivity to `https://gen.pollinations.ai`
- Verify API key permissions (publishable vs secret)
- Review error logs for specific issues
- Check rate limit status if receiving 429 errors
- Verify model name is correct for the endpoint being used

## Support

For issues with Pollinations.ai integration, visit:

- Documentation: https://enter.pollinations.ai
- API Reference: https://gen.pollinations.ai/docs

## Migration Notes (v2 → v3)

### Breaking Changes

1. **Base URLs Changed:**
   - Old: `https://image.pollinations.ai`
   - New: `https://gen.pollinations.ai/image/`

2. **Text Endpoint Changed:**
   - Old: `https://text.pollinations.ai/openai`
   - New: `https://gen.pollinations.ai/v1/chat/completions`

3. **Authentication Now Required:**
   - Old: Optional
   - New: Required (must include `Authorization: Bearer <key>` or `?key=<key>`)

4. **Text API Format:**
   - Old: GET request with query parameters
   - New: POST request with JSON body (OpenAI-compatible)

### Migration Checklist

- ✅ Update all base URLs to `https://gen.pollinations.ai`
- ✅ Add `Authorization: Bearer ${API_KEY}` headers to all requests
- ✅ Update text API calls from GET to POST
- ✅ Update text API response parsing to use `choices[0].message.content`
- ✅ Test image generation with new endpoints
- ✅ Test text generation with new endpoints
- ✅ Update error handling for 401 responses
- ✅ Update documentation and examples
