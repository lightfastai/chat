/**
 * AI Model Configurations
 *
 * This file re-exports model configurations from the central schema definition
 * to maintain backward compatibility with existing imports.
 */

import { DEFAULT_MODEL_ID, MODELS, getModelsForProvider } from "./schemas"
import type { ModelConfig } from "./schemas"

// Re-export individual model collections for backward compatibility
export const OPENAI_MODELS: Record<string, ModelConfig> = Object.fromEntries(
  getModelsForProvider("openai").map((model) => [model.id, model]),
)

export const ANTHROPIC_MODELS: Record<string, ModelConfig> = Object.fromEntries(
  getModelsForProvider("anthropic").map((model) => [model.id, model]),
)

export const OPENROUTER_MODELS: Record<string, ModelConfig> =
  Object.fromEntries(
    getModelsForProvider("openrouter").map((model) => [model.id, model]),
  )

// Re-export the complete models object
export const ALL_MODELS = MODELS

// Re-export default model ID
export { DEFAULT_MODEL_ID }

// Re-export functions from schemas for backward compatibility
export {
  getModelsForProvider,
  getVisibleModels,
  getModelConfig,
  getAllModelsIncludingHidden,
  getModelDisplayName,
  modelSupportsFeature,
} from "./schemas"

// Legacy function aliases for backward compatibility (deprecated)
export {
  getModelsForProvider as getModelsByProvider,
  getVisibleModels as getAllModels,
  getModelConfig as getModelById,
} from "./schemas"
