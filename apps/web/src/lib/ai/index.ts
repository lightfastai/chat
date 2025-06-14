/**
 * AI Utilities - Centralized AI model management
 *
 * This module provides utilities for managing AI models, providers,
 * and generation options across the application.
 */

// Types and utilities
export type {
  ModelProvider,
  ModelId,
  OpenAIModel,
  AnthropicModel,
  ModelConfig,
  ChatMessage,
  ModelSelectionProps,
  AIGenerationOptions,
} from "./types"

export {
  MODEL_PROVIDERS,
  OPENAI_MODEL_IDS,
  ANTHROPIC_MODEL_IDS,
  ALL_MODEL_IDS,
  isValidModelId,
  getProviderFromModelId,
  getActualModelName,
  isThinkingMode,
} from "./types"

// Models
export {
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
  ALL_MODELS,
  DEFAULT_MODEL_ID,
  getModelsByProvider,
  getAllModels,
  getModelById,
  getModelDisplayName,
  modelSupportsFeature,
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

// Constants for easy access
export const AI_PROVIDERS = ["openai", "anthropic"] as const
