# Testing JSON Structure Generator

## Overview

The JSON structure generator is the core of ColorVerse - it creates the website content (categories, items, descriptions) by calling AI models. This test suite validates that the AI generates high-fidelity JSON that matches our prompt requirements.

## Why Test This?

- **Validate Prompt Effectiveness**: Ensure the AI understands and follows our detailed prompt
- **Detect Quality Issues**: Catch generic titles, short descriptions, structural errors
- **Compare Models**: Test different AI models (gemini-fast, openai, mistral) to find best results
- **Pre-deployment Check**: Verify JSON quality before deploying changes

## Quick Start

```bash
# Set your API key
export POLLINATIONS_API_KEY=your-key-here

# Run quick test
npm run test:json-generator

# Or full integration test
npm run test:json-structure
```

Results saved to: `output/json-structure-*.json`

## Test Files

### 1. Standalone Script: `test-json-generator.js`

Quick manual testing with real-time console output.

```bash
npm run test:json-generator [model]

# Examples:
npm run test:json-generator              # default: gemini-fast
node test-json-generator.js openai       # test openai
node test-json-generator.js mistral      # test mistral
```

### 2. Integration Test: `src/tests/integration/json-structure-generator.test.ts`

Full E2E test with vitest integration.

```bash
npm run test:json-structure              # single model test
npm run test:integration                  # all integration tests
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

- [ ] Run `npm run test:json-generator`
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
npm run test:json-generator
```

### Compare models:

```bash
node test-json-generator.js gemini-fast > /tmp/gemini.log
node test-json-generator.js openai > /tmp/openai.log
diff /tmp/gemini.log /tmp/openai.log
```

### Check latest output:

```bash
cat output/$(ls -t output/json-structure-*.json | head -1) | jq '.metadata.quality'
```

## CI/CD Integration

```yaml
- name: Test JSON Structure
  env:
    POLLINATIONS_API_KEY: ${{ secrets.POLLINATIONS_API_KEY }}
  run: npm run test:json-structure
```
