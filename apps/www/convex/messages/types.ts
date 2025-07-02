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
