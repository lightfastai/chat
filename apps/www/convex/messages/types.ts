import { v } from "convex/values";
import {
	chatStatusValidator,
	messagePartsValidator,
	messageTypeValidator,
	modelIdValidator,
	modelProviderValidator,
	tokenUsageValidator,
} from "../validators.js";

// Shared message return type for queries
export const messageReturnValidator = v.object({
	_id: v.id("messages"),
	_creationTime: v.number(),
	threadId: v.id("threads"),
	timestamp: v.number(),
	messageType: messageTypeValidator,
	model: v.optional(modelProviderValidator),
	modelId: v.optional(modelIdValidator),
	thinkingStartedAt: v.optional(v.number()),
	thinkingCompletedAt: v.optional(v.number()),
	attachments: v.optional(v.array(v.id("files"))),
	usedUserApiKey: v.optional(v.boolean()),
	usage: tokenUsageValidator,
	// Message parts array following Vercel AI SDK v5 structure
	parts: v.optional(messagePartsValidator),
	// Message status following Vercel AI SDK v5 ChatStatus enum
	status: chatStatusValidator,
});

// Type for message usage updates
export interface MessageUsageUpdate {
	inputTokens?: number;
	outputTokens?: number;
	totalTokens?: number;
	reasoningTokens?: number;
	cachedInputTokens?: number;
}

// Type for formatted usage data
export interface FormattedUsage {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
	reasoningTokens: number;
	cachedInputTokens: number;
}

// Type for AI SDK usage data
export interface AISDKUsage {
	promptTokens?: number;
	completionTokens?: number;
	inputTokens?: number;
	outputTokens?: number;
	totalTokens?: number;
	reasoningTokens?: number;
	cachedInputTokens?: number;
	completionTokensDetails?: {
		reasoningTokens?: number;
	};
	promptTokensDetails?: {
		cachedTokens?: number;
	};
}

// Helper to format usage data from AI SDK
export function formatUsageData(
	usage: AISDKUsage | undefined | null,
): FormattedUsage | undefined {
	if (!usage) return undefined;

	return {
		inputTokens: usage.inputTokens ?? usage.promptTokens ?? 0,
		outputTokens: usage.outputTokens ?? usage.completionTokens ?? 0,
		totalTokens:
			usage.totalTokens ??
			(usage.inputTokens ?? usage.promptTokens ?? 0) +
				(usage.outputTokens ?? usage.completionTokens ?? 0),
		reasoningTokens:
			usage.reasoningTokens ??
			usage.completionTokensDetails?.reasoningTokens ??
			0,
		cachedInputTokens:
			usage.cachedInputTokens ?? usage.promptTokensDetails?.cachedTokens ?? 0,
	};
}
