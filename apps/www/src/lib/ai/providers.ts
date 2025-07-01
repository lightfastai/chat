import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI, openai } from "@ai-sdk/openai";
import type { CoreMessage } from "ai";
import {
	type AIGenerationOptions,
	type ChatMessage,
	type ModelId,
	type ModelProvider,
	getModelConfig,
	getModelsForProvider,
	getProviderFromModelId,
} from "./schemas";

/**
 * Get dynamic provider configuration from model data
 */
export function getProviderConfig(provider: ModelProvider) {
	const models = getModelsForProvider(provider);

	// Provider display names
	const providerNames = {
		openai: "OpenAI",
		anthropic: "Anthropic",
		openrouter: "OpenRouter",
	} as const;

	return {
		name: providerNames[provider],
		apiKeyEnvVar: `${provider.toUpperCase()}_API_KEY` as const,
		models: models.map((m) => m.id),
	};
}

/**
 * Legacy provider configuration object for backward compatibility
 * @deprecated Use getProviderConfig() for dynamic configuration
 */
export const PROVIDER_CONFIG = {
	get openai() {
		return getProviderConfig("openai");
	},
	get anthropic() {
		return getProviderConfig("anthropic");
	},
	get openrouter() {
		return getProviderConfig("openrouter");
	},
} as const;

/**
 * Get the appropriate language model instance for a provider
 * Note: This uses the default model for the provider
 */
export function getLanguageModel(provider: ModelProvider) {
	// Get first model for the provider as default
	const models = getModelsForProvider(provider);
	if (models.length === 0) {
		throw new Error(`No models found for provider: ${provider}`);
	}
	const model = models[0];

	if (!model) {
		throw new Error(`Default model not found for provider: ${provider}`);
	}

	switch (provider) {
		case "openai":
			return openai(model.name);
		case "anthropic":
			return anthropic(model.name);
		case "openrouter":
			// OpenRouter uses OpenAI-compatible API
			return createOpenAI({
				baseURL: "https://openrouter.ai/api/v1",
				headers: {
					"X-Title": "Lightfast Chat",
				},
			})(model.name);
		default:
			throw new Error(`Unsupported provider: ${provider}`);
	}
}

/**
 * Get language model by specific model ID
 */
export function getLanguageModelById(modelId: string) {
	const model = getModelConfig(modelId as ModelId);
	if (!model) {
		throw new Error(`Model not found: ${modelId}`);
	}

	switch (model.provider) {
		case "openai":
			return openai(model.name);
		case "anthropic":
			return anthropic(model.name);
		case "openrouter":
			// OpenRouter uses OpenAI-compatible API
			return createOpenAI({
				baseURL: "https://openrouter.ai/api/v1",
				headers: {
					"X-Title": "Lightfast Chat",
				},
			})(model.name);
		default:
			throw new Error(`Unsupported provider: ${model.provider}`);
	}
}

/**
 * Convert chat messages to the format expected by AI SDK
 */
export function convertToAIMessages(messages: ChatMessage[]): CoreMessage[] {
	return messages.map((msg) => ({
		role: msg.role,
		content: msg.content,
	}));
}

/**
 * Get default generation options for a provider
 */
export function getDefaultGenerationOptions(
	provider: ModelProvider,
): Partial<AIGenerationOptions> {
	// Get first model for the provider as default
	const models = getModelsForProvider(provider);
	if (models.length === 0) {
		// Fallback values if no models found
		return {
			maxTokens: 500,
			temperature: 0.7,
			stream: true,
		};
	}

	const model = models[0];
	return {
		maxTokens: Math.min(500, model.maxTokens), // Conservative default
		temperature: 0.7,
		stream: true,
	};
}

/**
 * Validate if a provider is supported
 */
export function isProviderSupported(
	provider: string,
): provider is ModelProvider {
	return ["openai", "anthropic", "openrouter"].includes(provider);
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: ModelProvider): string {
	return getProviderConfig(provider).name;
}

/**
 * Get all supported providers
 */
export function getSupportedProviders(): ModelProvider[] {
	return ["openai", "anthropic", "openrouter"];
}

/**
 * Create generation options with provider-specific defaults
 */
export function createGenerationOptions(
	modelId: string,
	overrides: Partial<AIGenerationOptions> = {},
): AIGenerationOptions {
	const provider = getProviderFromModelId(modelId as ModelId);
	if (!provider) {
		throw new Error(`Invalid model ID: ${modelId}`);
	}

	const defaults = getDefaultGenerationOptions(provider);

	return {
		modelId,
		messages: [],
		...defaults,
		...overrides,
	};
}
