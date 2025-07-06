# AI Model Configuration

## Adding a New Model

Add to `models/active.ts`:

```typescript
"model-id": ModelConfigSchema.parse({
  id: "model-id",
  provider: "openai" | "anthropic" | "openrouter",
  name: "actual-api-model-name",
  displayName: "User Friendly Name",
  description: "Brief description",
  maxTokens: 128000,
  costPer1KTokens: { input: 0.001, output: 0.002 },
  features: {
    streaming: true,
    functionCalling: true,
    vision: true,      // Can process images?
    thinking: false,   // Supports thinking mode?
    pdfSupport: false, // Can analyze PDFs? (Only Claude models)
  },
  // Optional fields:
  active: true,        // Show in UI? (defaults to true)
  streamingDelay: 20,  // Milliseconds between chunks
  thinkingConfig: {    // Only if thinking: true
    enabled: true,
    defaultBudgetTokens: 15000,
  },
}),
```

## Deprecating a Model

1. Move the model from `models/active.ts` to `models/deprecated.ts`
2. Set `active: false` to hide from UI
3. Update the description to mention it's deprecated

```typescript
// In models/deprecated.ts
"old-model": ModelConfigSchema.parse({
  id: "old-model",
  // ... other fields ...
  description: "Deprecated - use new-model instead",
  active: false,  // Hide from UI
}),
```

## Model Visibility

- `active: true` (default) - Model shown in UI
- `active: false` - Model hidden but still works for existing chats

Common reasons to hide models:
- High cost (e.g., Claude 4 Opus)
- Beta/preview status
- Older versions
- Deprecated models

## Finding Model Specifications

Use OpenRouter's model directory: **https://openrouter.ai/models**

This shows for each model:
- Context window (maxTokens)
- Pricing per million tokens
- Supported features

### Converting Prices
OpenRouter shows prices per 1M tokens. Divide by 1000 for our format:
- $2.50/1M tokens → $0.0025 per 1K tokens
- $10.00/1M tokens → $0.01 per 1K tokens

### Feature Notes
- **Vision**: Look for "Multimodal" or image icon
- **Function Calling**: Most modern models support it
- **Thinking**: Only Claude 3.7+, Claude 4, and o3-mini
- **PDF Support**: Only Anthropic models

## Important Notes

- The `name` field must match the exact API model name
- Never remove model IDs - production data may reference them
- All fields are required except: `active`, `streamingDelay`, `thinkingConfig`
- Run `pnpm run build` to validate changes