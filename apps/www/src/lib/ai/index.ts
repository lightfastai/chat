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
  ChatMessage,
  ModelSelectionProps,
  AIGenerationOptions,
  OpenAIModel,
  AnthropicModel,
  OpenRouterModel,
} from "./schemas"

export {
  // Core model data
  DEFAULT_MODEL_ID,
  ALL_MODEL_IDS,
  OPENAI_MODEL_IDS,
  ANTHROPIC_MODEL_IDS,
  OPENROUTER_MODEL_IDS,
  MODEL_PROVIDERS,
  // Model functions
  getModelConfig,
  getModelsForProvider,
  getVisibleModels,
  getDeprecatedModels,
  getAllModelsIncludingHidden,
  getModelDisplayName,
  modelSupportsFeature,
  getLegacyModelMapping,
  // Model utilities
  isValidModelId,
  getProviderFromModelId,
  getActualModelName,
  isThinkingMode,
  // API key validation
  validateApiKey,
  // Legacy collections (deprecated)
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
  OPENROUTER_MODELS,
  ALL_MODELS,
  // Legacy function aliases (deprecated)
  getModelsByProvider,
  getAllModels,
  getModelById,
} from "./schemas"

// Legacy re-exports for backward compatibility (deprecated)
// All types and functions are now exported from schemas above

// Legacy model file re-exports (deprecated)
// All model collections and functions are now exported from schemas above

// Providers
export {
  getProviderConfig,
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

// Capabilities
export type {
  AttachmentType,
  ModelCapability,
} from "./capabilities"

export {
  MODEL_CAPABILITIES,
  modelSupportsCapability,
  getModelCapabilities,
  getAttachmentType,
  modelSupportsAttachment,
  validateAttachmentsForModel,
  getIncompatibilityMessage,
  shouldWarnAboutCapabilities,
} from "./capabilities"
