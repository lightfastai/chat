/**
 * AI Utilities - Centralized AI model management
 *
 * This module provides utilities for managing AI models, providers,
 * and generation options across the application.
 */

// Types and utilities from schemas
export type {
	ModelProvider,
	ModelId,
	ModelConfig,
	ModelFeatures,
	ThinkingConfig,
} from "./schemas";

export {
	// Core model data
	DEFAULT_MODEL_ID,
	ALL_MODEL_IDS,
	// Model functions
	getModelConfig,
	getVisibleModels,
	getModelDisplayName,
	getProviderFromModelId,
	getActualModelName,
	isThinkingMode,
	getModelStreamingDelay,
	getModelById,
	// API key validation
	validateApiKey,
} from "./schemas";

// Capabilities
export type {
	AttachmentType,
	ModelCapability,
} from "./capabilities";

export {
	MODEL_CAPABILITIES,
	getModelCapabilities,
	validateAttachmentsForModel,
	getIncompatibilityMessage,
} from "./capabilities";

// Client
export { createAIClient, willUseUserApiKey } from "./client";
