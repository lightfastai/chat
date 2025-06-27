"use client";

import type { Doc } from "../../../../convex/_generated/dataModel";
import { StreamingReasoningDisplay } from "./streaming-reasoning-display";

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
	hasParts?: boolean;
	message?: Doc<"messages">;
}

export function AssistantMessageHeader({
	isStreaming,
	isComplete,
	streamingText,
	hasParts,
	message,
}: AssistantMessageHeaderProps) {
	// Check if message has reasoning parts
	const hasReasoningParts =
		message?.parts?.some((part) => part.type === "reasoning") || false;

	// Get reasoning content from parts
	const reasoningContent = message?.parts
		?.filter((part) => part.type === "reasoning")
		.map((part) => part.text)
		.join("\n");

	// Check if message has any actual content
	const hasContent = (() => {
		// First check streamingText
		if (streamingText && streamingText.trim().length > 0) return true;

		// Check if message has parts with content
		if (hasParts && message?.parts && message.parts.length > 0) {
			return message.parts.some(
				(part) =>
					(part.type === "text" && part.text && part.text.trim().length > 0) ||
					part.type === "tool-call",
			);
		}

		// Check message body as fallback
		if (message?.body && message.body.trim().length > 0) return true;

		return false;
	})();

	// Show streaming reasoning display
	return (
		<StreamingReasoningDisplay
			isStreaming={!!isStreaming}
			isComplete={!!isComplete}
			hasContent={hasContent}
			reasoningContent={reasoningContent}
			hasReasoningParts={hasReasoningParts}
		/>
	);
}
