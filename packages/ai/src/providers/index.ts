import { ACTIVE_MODELS } from "./models/active";
import { DEPRECATED_MODELS } from "./models/deprecated";
import type { ModelConfig, ModelProvider } from "./schemas";

// Merge all models together
export const MODELS = {
	...ACTIVE_MODELS,
	...DEPRECATED_MODELS,
} as const;

// Derive ModelId type from actual models
export type ModelId = keyof typeof MODELS;

// Export derived types
export type {
	ModelConfig,
	ModelProvider,
	ModelFeatures,
	ThinkingConfig,
} from "./schemas";

// Export schemas for validators
export { ModelProviderSchema } from "./schemas";

// Export collections for validators
export const ALL_MODEL_IDS = Object.keys(MODELS) as ModelId[];

// Helper functions
export function getModelConfig(modelId: ModelId): ModelConfig {
	return MODELS[modelId];
}

export function getVisibleModels(): ModelConfig[] {
	return Object.values(MODELS).filter((model) => model.active);
}

// Default model ID
export const DEFAULT_MODEL_ID: ModelId = "gpt-4o-mini";

// Display name utility
export function getModelDisplayName(modelId: string): string {
	const model = MODELS[modelId as ModelId];
	return model?.displayName ?? "Unknown Model";
}

// Extract provider from modelId (type-safe)
export function getProviderFromModelId(modelId: ModelId): ModelProvider {
	const model = getModelConfig(modelId);
	return model.provider;
}

// Get actual model name for API calls (removes -thinking suffix)
export function getActualModelName(modelId: ModelId): string {
	const model = getModelConfig(modelId);
	return model.name;
}

// Check if model is in thinking mode
export function isThinkingMode(modelId: ModelId): boolean {
	const model = getModelConfig(modelId);
	return (
		model.features.thinking === true && model.thinkingConfig?.enabled === true
	);
}

// Get the optimal streaming delay for a given model
export function getModelStreamingDelay(modelId: ModelId): number {
	const model = getModelConfig(modelId);
	return model.streamingDelay ?? 15; // Default to 15ms if not specified
}

// Legacy alias for backward compatibility
export const getModelById = getModelConfig;

// Re-export validation functions
export { validateApiKey } from "./schemas";
