import { MODELS, ModelId, ALL_MODEL_IDS } from "./schemas"

/**
 * Generates Convex validator code from the model definitions
 * This is used to keep convex/validators.ts in sync with our schema
 */
export function generateConvexModelValidator(): string {
  const literals = ALL_MODEL_IDS.map((id) => `v.literal("${id}")`).join(",\n    ")
  
  return `v.union(\n    ${literals}\n  )`
}

/**
 * Generates the model ID type definition for Convex
 */
export function generateModelIdType(): string {
  return ALL_MODEL_IDS.map((id) => `"${id}"`).join(" | ")
}

/**
 * Generates provider-specific model arrays for backward compatibility
 */
export function generateProviderModels() {
  const openaiModels = Object.values(MODELS).filter(m => m.provider === "openai")
  const anthropicModels = Object.values(MODELS).filter(m => m.provider === "anthropic")
  const openrouterModels = Object.values(MODELS).filter(m => m.provider === "openrouter")
  
  return {
    OPENAI_MODELS: openaiModels,
    ANTHROPIC_MODELS: anthropicModels,
    OPENROUTER_MODELS: openrouterModels,
  }
}

/**
 * CLI script to generate Convex validators
 * Run with: bun run src/lib/ai/generators.ts
 */
if (import.meta.main) {
  console.log("// Generated model ID validator for Convex")
  console.log("export const modelIdValidator = " + generateConvexModelValidator())
  console.log("\n// Generated ModelId type")
  console.log("export type ModelId = " + generateModelIdType())
}