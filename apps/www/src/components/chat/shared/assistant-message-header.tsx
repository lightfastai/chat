"use client";

interface AssistantMessageHeaderProps {
	modelName?: string;
	usedUserApiKey?: boolean;
	isStreaming?: boolean;
	isComplete?: boolean;
	thinkingStartedAt?: number;
	thinkingCompletedAt?: number;
	streamingText?: string;
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
	streamingText,
}: AssistantMessageHeaderProps) {
	// Only show "Thinking" status during streaming AND when no text has started yet
	if (isStreaming && !isComplete && !streamingText) {
		return (
			<div className="text-xs text-muted-foreground mb-2 flex items-center gap-2 min-h-5">
				<span>Thinking...</span>
			</div>
		);
	}

	// Don't show header for completed messages or when text is streaming
	return null;
}
