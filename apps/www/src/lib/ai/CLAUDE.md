# AI Model Configuration Guidelines

This directory contains AI model configurations for the chat application. When working in this directory, follow these guidelines:

## 🏗️ Architecture Overview

**Single Source of Truth**: All AI model definitions are centralized in `schemas.ts` using Zod for runtime validation and TypeScript for compile-time safety.

### Key Files
- **`schemas.ts`** - Central source of truth with all 33 model definitions
- **`types.ts`** - Re-exports types for backward compatibility
- **`models.ts`** - Re-exports model collections for backward compatibility  
- **`providers.ts`** - Provider-specific utilities and configurations
- **`index.ts`** - Public API exports

### Architecture Benefits
- ✅ **No Duplication**: Model IDs defined once, used everywhere
- ✅ **Runtime Validation**: Zod schemas catch invalid configurations
- ✅ **Type Safety**: TypeScript magic for provider-specific model types
- ✅ **Direct Imports**: Convex validators import directly from schemas
- ✅ **Backward Compatible**: All existing imports continue to work

## 🔧 Model Configuration

### Adding New Models

All models are defined in the `MODELS` object in `schemas.ts`:

```typescript
// In schemas.ts
export const MODELS = {
  "new-model-id": ModelConfigSchema.parse({
    id: "new-model-id",
    provider: "openai" | "anthropic" | "openrouter",
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
      thinking: false,    // Only for Claude 4.0+
    },
    thinkingConfig: {     // Optional, only if thinking: true
      enabled: true,
      defaultBudgetTokens: 12000,
    },
    deprecated: false,    // Optional
    replacedBy: undefined, // Optional, for deprecated models
    hidden: false,        // Optional, hide from UI
  }),
} as const
```

### Validation & Type Safety

The architecture automatically provides:

```typescript
// Type-safe model IDs
type ModelId = keyof typeof MODELS  // All 33 model IDs

// Provider-specific types  
type OpenAIModelId = "gpt-4o" | "gpt-4o-mini" | ...
type AnthropicModelId = "claude-4-sonnet-20250514" | ...

// Runtime validation
const config = ModelConfigSchema.parse(modelData)  // Throws if invalid

// Convex validators (auto-generated from schemas)
export const modelIdValidator = v.union(
  ...ALL_MODEL_IDS.map(id => v.literal(id))
)
```

## 📋 Model Capabilities Reference

### Vision Support
- ✅ **Has Vision**: GPT-4o, GPT-4o-mini, All Claude models, Grok 3, Gemini models
- ❌ **NO Vision**: GPT-3.5-turbo, Claude 3.5 Haiku

### PDF Support  
- ✅ **Has PDF Support**: All Claude models (3, 3.5, 4)
- ❌ **NO PDF Support**: All OpenAI models, OpenRouter models

### Thinking Mode
- ✅ **Thinking Capable**: Claude 4 Opus, Claude 4 Sonnet, Claude 3.7 Sonnet
- 📝 **Thinking Variants**: Models with `-thinking` suffix show reasoning process

### Special Features
- **Streaming**: All models support streaming
- **Function Calling**: All models support function calling
- **High Context**: GPT-4.1 (1M tokens), Gemini models (1M+ tokens)

## ⚠️ Critical Guidelines

### Model Capabilities Must Be Verified

**IMPORTANT**: When adding or updating models, you MUST:

1. **Research actual capabilities** through official documentation
2. **Never assume capabilities** based on model names or versions
3. **Test thoroughly** after configuration changes
4. **Verify cost information** from provider pricing pages

### Common Mistakes to Avoid

1. **Assuming GPT-3.5 has vision** - It's text-only!
2. **Assuming OpenAI models read PDFs** - Only Claude supports native PDF analysis
3. **Hardcoding model checks** - Always use the configuration system
4. **Adding models without Zod validation** - All configs must use `ModelConfigSchema.parse()`

### Model Deletion and Migration Process

**CRITICAL**: Never remove model IDs directly - production data may reference them.

#### Safe Migration Process

1. **Mark as deprecated** instead of removing:
```typescript
"old-model-id": ModelConfigSchema.parse({
  id: "old-model-id",
  deprecated: true,
  replacedBy: "new-model-id",
  hidden: true,  // Hide from UI
  // ... rest of config
}),
```

2. **Update Convex validators** - The direct import will automatically include deprecated models
3. **Test build** to ensure no validation errors: `SKIP_ENV_VALIDATION=true pnpm run build`
4. **Check production logs** before removing deprecated models entirely

## 🔄 Development Workflow

### Making Changes

1. **Edit `schemas.ts`** - Add/modify model configurations
2. **Automatic propagation** - Changes flow to Convex validators via direct import
3. **Test build** - Ensure TypeScript compilation succeeds
4. **Run quality gates** - `pnpm run lint && pnpm run format`
5. **Test capabilities** - Verify model features work as expected

### Quality Gates

Always run these commands after model changes:

```bash
# Build validation
SKIP_ENV_VALIDATION=true pnpm run build

# Code quality
pnpm run lint
pnpm run format
```

### Testing Model Capabilities

After adding/updating a model:

1. **Image attachment test** (if vision enabled)
2. **PDF attachment test** (if pdfSupport enabled)  
3. **Function calling test** (all models should support)
4. **Thinking mode test** (if thinking enabled)
5. **Error message verification** - Ensure helpful feedback

## 🏛️ Architecture Decisions

### Why Direct Imports vs Generation?

**Previous**: Code generation script created Convex validators at build time
**Current**: Direct imports from `schemas.ts` to `convex/validators.ts`

**Benefits of Direct Imports**:
- ✅ Simpler architecture - no build-time generation step
- ✅ Real-time updates - changes immediately available
- ✅ Better developer experience - no intermediate files
- ✅ Leverages Convex's ability to import from `src/`

### Why Zod Schemas?

- **Runtime Validation**: Catch invalid model configurations at parse time
- **Type Inference**: Automatic TypeScript types from schema definitions
- **Documentation**: Schema serves as living documentation
- **API Key Validation**: Consistent validation patterns for provider keys

### Backward Compatibility Strategy

- **Re-export pattern**: `types.ts` and `models.ts` re-export from `schemas.ts`
- **Legacy type aliases**: Maintain existing type names for smooth migration
- **Deprecated model support**: Keep old model IDs for production data compatibility
- **Gradual migration**: Phase out old patterns without breaking changes

## 🚀 Future Enhancements

### Planned Improvements

1. **Model capability detection** - Automatic feature detection from provider APIs
2. **Cost tracking** - Real-time cost calculation and budgeting
3. **Performance metrics** - Response time and quality tracking per model
4. **A/B testing framework** - Compare model performance systematically

### Extensibility Points

- **New providers** - Add to `ModelProvider` enum and provider configs
- **New features** - Extend `ModelFeatures` interface as capabilities evolve
- **Custom configurations** - Provider-specific settings in model configs
- **Rate limiting** - Per-model and per-provider rate limit configurations