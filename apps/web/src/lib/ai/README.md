# AI Model Capabilities Documentation

## Overview

This directory contains the AI model configurations and utilities for the chat application. When adding new models or updating existing ones, it's crucial to properly configure their capabilities.

## Model Capabilities

Each model in `models.ts` must define the following capability flags:

### Required Features
- `streaming`: boolean - Whether the model supports streaming responses
- `functionCalling`: boolean - Whether the model supports function/tool calling
- `vision`: boolean - Whether the model can process images

### Optional Features
- `thinking`: boolean - Whether the model supports thinking/reasoning mode (Claude 4.0)
- `pdfSupport`: boolean - Whether the model can natively process PDF files

## Current Model Capabilities

### OpenAI Models
- **GPT-4o & GPT-4o-mini**: 
  - ✅ Vision support (accepts image URLs directly)
  - ❌ No PDF support
  - ✅ Streaming & function calling

- **GPT-3.5-turbo**: 
  - ❌ NO vision support (text-only model)
  - ❌ No PDF support
  - ✅ Streaming & function calling

### Anthropic Models
All Claude models (3, 3.5, 4) support:
- ✅ Vision support (accepts image URLs)
- ✅ Native PDF support
- ✅ Streaming & function calling
- ✅ Thinking mode (Claude 4.0 only)

## Adding New Models

When adding a new model:

1. **Research the model's capabilities** through official documentation
2. **Update the model configuration** in `models.ts`:
   ```typescript
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
       vision: false,  // Set based on actual capability
       pdfSupport: false  // Only true for Claude models currently
     }
   }
   ```

3. **Test with different file types** to verify capabilities work as configured

## How Capabilities Are Used

The system uses these capability flags to:

1. **Generate appropriate system prompts** - Models without vision get different instructions
2. **Handle file attachments** - Images are processed differently based on vision support
3. **Show user warnings** - When unsupported files are attached, users get helpful messages
4. **Route PDF processing** - Only models with pdfSupport can analyze PDFs directly

## Important Notes

- **Never assume capabilities** - Always verify through official documentation
- **GPT-3.5 is text-only** - Despite being a popular model, it has NO vision support
- **Only Claude supports PDFs** - All OpenAI models require PDF-to-text conversion
- **Test thoroughly** - Capability misconfigurations lead to runtime errors

## Updating Capabilities

If a model's capabilities change (e.g., GPT-3.5 gets vision support):

1. Update the model configuration in `models.ts`
2. Update this README with the new information
3. Test with sample images/PDFs to verify
4. Update any hardcoded checks in `convex/messages.ts`

## Related Files

- `types.ts` - Defines the ModelConfig interface with features
- `models.ts` - Contains all model configurations
- `../../convex/messages.ts` - Uses capabilities for attachment handling