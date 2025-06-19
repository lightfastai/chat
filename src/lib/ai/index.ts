/**
 * AI Utilities - Centralized AI model management
 *
 * This module provides utilities for managing AI models, providers,
 * and generation options across the application.
 */

// Types and utilities from schemas (primary source)
export type {
  ModelProvider,
  ModelId,
  ModelConfig,
  ModelFeatures,
  ThinkingConfig,
  OpenAIModelId,
  AnthropicModelId,
  OpenRouterModelId,
} from "./schemas"

export {
  ALL_MODEL_IDS,
  OPENAI_MODEL_IDS,
  ANTHROPIC_MODEL_IDS,
  OPENROUTER_MODEL_IDS,
  getModelConfig,
  getModelsForProvider,
  getVisibleModels,
  getDeprecatedModels,
  getLegacyModelMapping,
  validateApiKey,
  DEFAULT_MODEL_ID,
  getAllModelsIncludingHidden,
  getModelDisplayName,
  modelSupportsFeature,
} from "./schemas"

// Additional types from types.ts
export type {
  ChatMessage,
  ModelSelectionProps,
  AIGenerationOptions,
  // Legacy type aliases
  OpenAIModel,
  AnthropicModel,
  OpenRouterModel,
} from "./types"

export {
  MODEL_PROVIDERS,
  isValidModelId,
  getProviderFromModelId,
  getActualModelName,
  isThinkingMode,
} from "./types"

// Models (collections and legacy aliases)
export {
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
  OPENROUTER_MODELS,
  ALL_MODELS,
  // Legacy aliases (deprecated - use standardized names above)
  getModelsByProvider,
  getAllModels,
  getModelById,
} from "./models"

// Providers
export {
  PROVIDER_CONFIG,
  getLanguageModel,
  getLanguageModelById,
  convertToAIMessages,
  getDefaultGenerationOptions,
  isProviderSupported,
  getProviderDisplayName,
  getSupportedProviders,
  createGenerationOptions,
} from "./providers"

// API key validation is now exported from schemas above

// Constants for easy access
export const AI_PROVIDERS = ["openai", "anthropic", "openrouter"] as const
