/**
 * AI Model Types and Configurations
 * 
 * This file re-exports types from the central schema definition
 * to maintain backward compatibility with existing imports.
 */

// Re-export all types from schemas
export type {
  ModelProvider,
  ModelConfig,
  ModelFeatures,
  ThinkingConfig,
  ModelId,
  OpenAIModelId,
  AnthropicModelId,
  OpenRouterModelId,
} from "./schemas"

// Re-export type guards and utilities
export {
  getModelConfig,
  getModelsForProvider,
  getVisibleModels,
  getDeprecatedModels,
  getLegacyModelMapping,
  validateApiKey,
} from "./schemas"

// Re-export constants for backward compatibility
export {
  ALL_MODEL_IDS,
  OPENAI_MODEL_IDS,
  ANTHROPIC_MODEL_IDS,
  OPENROUTER_MODEL_IDS,
} from "./schemas"

// Additional types not in schemas (keep these separate)
export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ModelSelectionProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  disabled?: boolean
}

export interface AIGenerationOptions {
  modelId: string
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

// Legacy type aliases for smoother migration
export type OpenAIModel = OpenAIModelId
export type AnthropicModel = AnthropicModelId  
export type OpenRouterModel = OpenRouterModelId

// Re-export MODEL_PROVIDERS for backward compatibility
export const MODEL_PROVIDERS = ["openai", "anthropic", "openrouter"] as const

// Type-safe model ID validation
export function isValidModelId(modelId: string): modelId is ModelId {
  return (ALL_MODEL_IDS as readonly string[]).includes(modelId)
}

// Extract provider from modelId (type-safe)
export function getProviderFromModelId(modelId: ModelId): ModelProvider {
  const model = getModelConfig(modelId)
  return model.provider
}

// Get actual model name for API calls (removes -thinking suffix)
export function getActualModelName(modelId: ModelId): string {
  const model = getModelConfig(modelId)
  return model.name
}

// Check if model is in thinking mode
export function isThinkingMode(modelId: ModelId): boolean {
  const model = getModelConfig(modelId)
  return model.features.thinking === true && model.thinkingConfig?.enabled === true
}