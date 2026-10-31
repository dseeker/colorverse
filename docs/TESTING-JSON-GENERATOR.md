# Testing JSON Structure Generator

## Overview

The JSON structure generator creates website content (categories, items, descriptions).
The current integration suite uses a mocked Pollinations response by default to
validate structure without paid API access. Live quality checks are explicitly opt-in.

## Why Test This?

- **Validate Prompt Effectiveness**: Ensure the AI understands and follows our detailed prompt
- **Detect Quality Issues**: Catch generic titles, short descriptions, structural errors
- **Compare Models**: Test different AI models (gemini-fast, openai, mistral) to find best results
- **Pre-deployment Check**: Verify JSON quality before deploying changes

## Quick Start

```bash
# Mocked integration test: no API key or paid access needed
npm run test:json-structure

# Optional live integration check (requires a valid key and provider access)
POLLINATIONS_LIVE_TEST=true npm run test:json-structure
```

For live checks, set `POLLINATIONS_API_KEY` in the environment first. Generated
reports are saved under `output/`; mocked reports do not measure model quality.

## Test Files

### 1. Legacy Standalone Script: `archive/test-json-generator.js`

Archived reference for manual testing with real API calls and console output.
It is not the default test runner and does not use the integration suite's mocks.
Legacy model names may no longer be supported by the provider.

```bash
node archive/test-json-generator.js              # legacy default: gemini-fast
node archive/test-json-generator.js openai       # legacy manual check
node archive/test-json-generator.js mistral      # legacy manual check
```

### 2. Current Integration Test: `tests/integration/json-structure-generator.test.ts`

Vitest integration test; mocked unless `POLLINATIONS_LIVE_TEST=true`.

```bash
npm run test:json-structure               # focused one-shot integration check
npm run test:integration                  # all integration tests, one-shot
```

## What Gets Tested

### Structure Validation ✅

- Brand object with name + vision
- Seasonal gallery with 12 items
- All categories present
- All items have title + description

### Quality Analysis 📊

- **Unique Titles**: All must be different
- **No Generic Patterns**: "Title 1", "Sample X" rejected
- **Length Checks**: Titles 20-40 chars, descriptions >30 chars
- **Season Alignment**: Match current season theme

## Output Format

```json
{
  "metadata": {
    "model": "gemini-fast",
    "season": "winter",
    "validationErrors": [],
    "quality": {
      "totalItems": 12,
      "uniqueTitles": 12,
      "genericTitles": 0,
      "avgTitleLength": 28.5
    }
  },
  "data": {
    /* full generated JSON */
  }
}
```

## Evaluating Results

### ✅ Good Result

```
✅ Structure validation passed
📈 Quality Analysis:
  🎯 Unique titles: 12/12
  ✅ No generic titles detected

Sample: "Snowflake Ballet Dancer"
```

### ❌ Issues Found

```
❌ VALIDATION ERRORS:
  • Generic title: "Seasonal Item 1"
  • Short description: < 30 chars

⚠️  Generic titles (2):
  • "Seasonal Item Title 1"
  • "Sample Winter"
```

## Pre-deployment Checklist

Before deploying prompt/model changes:

- [ ] Run `npm run test:json-structure` for deterministic structure checks
- [ ] Opt in to live evaluation with `POLLINATIONS_LIVE_TEST=true` if model quality must be assessed
- [ ] Verify 0 validation errors
- [ ] Verify 0 generic titles
- [ ] Check all 12 titles are unique
- [ ] Review sample output quality
- [ ] Test 2-3 different models for comparison

## Common Issues

| Issue              | Fix                                  |
| ------------------ | ------------------------------------ |
| API Error 401      | Check `POLLINATIONS_API_KEY` env var |
| API Error 429      | Wait 1-2 minutes, then retry         |
| Generic titles     | Strengthen prompt requirements       |
| Short descriptions | Add min length to prompt             |

## Best Practices

1. **Test before deployment** - Catch issues early
2. **Save baselines** - Keep good examples for comparison
3. **Compare models** - Find which produces best results
4. **Monitor trends** - Track quality over time

## Examples

### Quick quality check:

```bash
npm run test:json-structure
```

### Compare models:

```bash
mkdir -p output
node archive/test-json-generator.js gemini-fast > output/gemini.log
node archive/test-json-generator.js openai > output/openai.log
diff output/gemini.log output/openai.log
```

### Check latest output:

```bash
cat output/$(ls -t output/json-structure-*.json | head -1) | jq '.metadata.quality'
```

## CI/CD Integration

```yaml
- name: Test JSON Structure
  run: npm run test:json-structure
```

CI uses mocks by default. Only a deliberately configured live job should set
`POLLINATIONS_LIVE_TEST=true` and provide `POLLINATIONS_API_KEY`.
