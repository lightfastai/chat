import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createProviderRegistry, type LanguageModel } from "ai";
import {
	type ModelId,
	getActualModelName,
	getProviderFromModelId,
} from "../providers";

// Type for API keys - all required
export type ApiKeys = {
	openai: string;
	anthropic: string;
	openrouter: string;
};

/**
 * Create an AI client for a specific model
 * Requires API keys for all providers
 */
export function createAIClient(
	modelId: ModelId,
	apiKeys: ApiKeys,
): LanguageModel {
	const provider = getProviderFromModelId(modelId);
	const modelName = getActualModelName(modelId);

	// Create registry with provided API keys
	const registry = createProviderRegistry({
		openai: createOpenAI({ apiKey: apiKeys.openai }),
		anthropic: createAnthropic({ apiKey: apiKeys.anthropic }),
		openrouter: createOpenAI({
			apiKey: apiKeys.openrouter,
			baseURL: "https://openrouter.ai/api/v1",
			headers: { "X-Title": "Lightfast Chat" },
		}),
	});

	// Format: provider:model-name
	type ModelString = `${typeof provider}:${string}`;
	const modelString = `${provider}:${modelName}` as ModelString;
	return registry.languageModel(modelString);
}

/**
 * Check if user's API key will be used for a given provider
 */
export function willUseUserApiKey(
	provider: "anthropic" | "openai" | "openrouter",
	apiKeys?: ApiKeys,
): boolean {
	if (!apiKeys) return false;

	switch (provider) {
		case "anthropic":
			return !!apiKeys.anthropic;
		case "openai":
			return !!apiKeys.openai;
		case "openrouter":
			return !!apiKeys.openrouter;
		default:
			return false;
	}
}
