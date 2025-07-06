import {
	type ApiKeys,
	createAIClient as createBaseClient,
} from "@lightfast/ai/client";
import type { ModelId } from "@lightfast/ai/providers";
import type { LanguageModel } from "ai";
import { env } from "../../env";
import type { UserApiKeys } from "../../types";

/**
 * Create an AI client with API keys from either user settings or environment
 * This is the Convex-specific implementation that knows about env.ts
 *
 * Type safety is ensured by inferring UserApiKeys from the Convex validator,
 * which guarantees alignment with the database schema.
 */
export function createAIClient(
	modelId: ModelId,
	userApiKeys?: UserApiKeys | null,
): LanguageModel {
	// Merge user keys with environment keys
	// User keys take precedence over environment keys
	const apiKeys: ApiKeys = {
		openai: userApiKeys?.openai || env.OPENAI_API_KEY || "",
		anthropic: userApiKeys?.anthropic || env.ANTHROPIC_API_KEY || "",
		openrouter: userApiKeys?.openrouter || env.OPENROUTER_API_KEY || "",
	};

	// The provider registry will handle empty strings appropriately
	// Each provider will only be used if the model requires it
	return createBaseClient(modelId, apiKeys);
}
