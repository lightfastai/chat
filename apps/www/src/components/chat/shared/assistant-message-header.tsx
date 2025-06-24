"use client";

interface AssistantMessageHeaderProps {
	modelName?: string;
	usedUserApiKey?: boolean;
	isStreaming?: boolean;
	isComplete?: boolean;
	thinkingStartedAt?: number;
	thinkingCompletedAt?: number;
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
		totalTokens?: number;
		reasoningTokens?: number;
		cachedInputTokens?: number;
	};
}

export function AssistantMessageHeader({
	isStreaming,
	isComplete,
}: AssistantMessageHeaderProps) {
	// Only show "Thinking" status during streaming, all other info moved to hover tooltip
	if (isStreaming && !isComplete) {
		return (
			<div className="text-xs text-muted-foreground mb-2 flex items-center gap-2 min-h-5">
				<span>Thinking...</span>
			</div>
		);
	}

	// Don't show header for completed messages - info is now in the actions tooltip
	return null;
}
