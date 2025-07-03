"use client";

import type { UIMessage } from "ai";
import type { DbReasoningPart, DbTextPart } from "../../../../convex/types";
import { StreamingReasoningDisplay } from "./streaming-reasoning-display";

interface MessageMetadata {
	hasThinkingContent?: boolean;
	thinkingContent?: string;
}

interface AssistantMessageHeaderProps {
	modelName?: string;
	usedUserApiKey?: boolean;
	isStreaming?: boolean;
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
	message?: UIMessage;
}

export function AssistantMessageHeader({
	isStreaming,
	streamingText,
	hasParts,
	message,
}: AssistantMessageHeaderProps) {
	const metadata = (message?.metadata as MessageMetadata) || {};

	// Check if message has reasoning parts
	const hasReasoningParts = Boolean(
		message?.parts?.some((part) => part.type === "reasoning") ||
			(metadata.hasThinkingContent && metadata.thinkingContent),
	);

	// Get reasoning content from parts or legacy fields
	const reasoningContent = (() => {
		// First try new parts-based system
		const partsContent = message?.parts
			?.filter((part): part is DbReasoningPart => part.type === "reasoning")
			.map((part) => part.text)
			.join("\n");

		if (partsContent?.trim()) {
			return partsContent;
		}

		// Fall back to legacy thinking content from metadata
		if (metadata.hasThinkingContent && metadata.thinkingContent) {
			return metadata.thinkingContent;
		}

		return undefined;
	})();

	// Check if message has any actual content
	const hasContent = (() => {
		// First check streamingText
		if (streamingText && streamingText.trim().length > 0) return true;

		// Check if message has parts with content
		if (hasParts && message?.parts && message.parts.length > 0) {
			return message.parts.some(
				(part) =>
					(part.type === "text" &&
						(part as DbTextPart).text &&
						(part as DbTextPart).text.trim().length > 0) ||
					part.type.startsWith("tool-"),
			);
		}

		// For UIMessages, we always have content if there are parts
		if (message?.parts?.length) return true;

		return false;
	})();

	// Show streaming reasoning display
	return (
		<StreamingReasoningDisplay
			isStreaming={!!isStreaming}
			hasContent={hasContent}
			reasoningContent={reasoningContent}
			hasReasoningParts={hasReasoningParts}
		/>
	);
}
