# AI Model Configuration Guidelines

This directory contains AI model configurations for the chat application. When working in this directory, follow these guidelines:

## Model Capabilities Must Be Verified

**IMPORTANT**: When adding or updating models in `models.ts`, you MUST:

1. **Research the model's actual capabilities** through official documentation
2. **Never assume capabilities** based on model names or versions
3. **Test thoroughly** after configuration changes

## Current Model Capabilities

### Vision Support
- ✅ **Has Vision**: GPT-4o, GPT-4o-mini, All Claude models
- ❌ **NO Vision**: GPT-3.5-turbo (text-only model!)

### PDF Support  
- ✅ **Has PDF Support**: All Claude models (3, 3.5, 4)
- ❌ **NO PDF Support**: All OpenAI models

### Special Features
- **Thinking Mode**: Only Claude 4.0 models
- **Streaming**: All models support streaming
- **Function Calling**: All models support function calling

## Common Mistakes to Avoid

1. **Assuming GPT-3.5 has vision** - It doesn't! It's text-only despite being a popular model
2. **Assuming OpenAI models can read PDFs** - They can't! Only Claude supports native PDF analysis
3. **Hardcoding model checks** - Always use the model configuration in `models.ts`

## Adding New Models

When adding a new model:

```typescript
// In models.ts
"new-model-id": {
  id: "new-model-id",
  provider: "openai" | "anthropic",
  name: "actual-api-model-name",
  displayName: "User-friendly name",
  description: "Brief description",
  maxTokens: 128000,
  costPer1KTokens: { input: 0.001, output: 0.002 },
  features: {
    streaming: true,
    functionCalling: true,
    vision: false,      // ⚠️ VERIFY THIS!
    pdfSupport: false,  // ⚠️ VERIFY THIS!
    thinking?: false    // Only for Claude 4.0
  }
}
```

## Testing Model Capabilities

After adding/updating a model:

1. Test with an image attachment
2. Test with a PDF attachment (if applicable)
3. Verify error messages are helpful
4. Check that the system prompt reflects capabilities

## File Organization

- `types.ts` - Defines ModelConfig interface with feature flags
- `models.ts` - Contains all model configurations
- `providers.ts` - Provider-specific utilities
- `index.ts` - Public API exports