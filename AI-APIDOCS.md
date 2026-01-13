# Pollinations.ai API Documentation (v3)

This document covers the latest Pollinations.ai API v3 implementation.

## Quick Links

- **API Dashboard:** [enter.pollinations.ai](https://enter.pollinations.ai)
- **API Documentation:** [gen.pollinations.ai/docs](https://gen.pollinations.ai/docs)
- **GitHub:** [github.com/pollinations/pollinations](https://github.com/pollinations/pollinations)

## API Endpoints

| Feature          | Endpoint                                          | Method | Auth Required |
| ---------------- | ------------------------------------------------- | ------ | ------------- |
| Image Generation | `https://gen.pollinations.ai/image/{prompt}`      | GET    | ✅ Yes        |
| Text Generation  | `https://gen.pollinations.ai/v1/chat/completions` | POST   | ✅ Yes        |
| Simple Text      | `https://gen.pollinations.ai/text/{prompt}`       | GET    | ✅ Yes        |
| Image Models     | `https://gen.pollinations.ai/image/models`        | GET    | ❌ No         |
| Text Models      | `https://gen.pollinations.ai/v1/models`           | GET    | ❌ No         |

## Authentication

All API requests (except model listing) require authentication via one of:

1. **Header:** `Authorization: Bearer YOUR_API_KEY`
2. **Query Parameter:** `?key=YOUR_API_KEY`

**Key Types:**

- `pk_*`: Publishable key, client-side safe, rate-limited
- `sk_*`: Secret key, server-side only, no limits

## Quick Examples

### Generate Image

```bash
curl "https://gen.pollinations.ai/image/a%20cat?model=flux&width=1024&height=1024" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  --output cat.jpg
```

### Generate Text

```bash
curl "https://gen.pollinations.ai/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai",
    "messages": [{"role": "user", "content": "Say hello"}]
  }'
```

### Generate JSON

```bash
curl "https://gen.pollinations.ai/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai",
    "messages": [{"role": "user", "content": "Generate a JSON object"}],
    "response_format": {"type": "json_object"}
  }'
```

## Available Models

### Image Models

- `flux` (default)
- `turbo`
- `gptimage`
- `kontext`
- `seedream`
- `nanobanana`
- `nanobanana-pro`

### Text Models

- `openai`
- `openai-large`
- `openai-small`
- `gemini`
- `gemini-fast`
- `gemini-large`
- `gemini-search`
- `mistral`
- `claude`

## Rate Limits

- **Publishable Keys:** 1 pollen/hour per IP+key
- **Secret Keys:** No rate limits, requires Pollen balance

## See Also

- See `POLLINATIONS_INTEGRATION.md` for detailed integration guide
- See `AI-APIDOCS-OLD.md` for deprecated API v2 documentation

## Changelog

### v3 (Current)

- **Base URL:** Changed to `gen.pollinations.ai`
- **Authentication:** Now required for all requests
- **Text API:** Now uses OpenAI-compatible POST format
- **Image Path:** Changed from `/prompt/` to `/image/`

### v2 (Deprecated)

- **Base URL:** `image.pollinations.ai` / `text.pollinations.ai`
- **Authentication:** Optional
- **Text API:** GET request format
