"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import {
	type DbMessagePart,
	type DbToolCallPart,
	type DbToolInputStartPart,
	type DbToolResultPart,
	isErrorPart,
	isReasoningPart,
	isTextPart,
	isToolCallPart,
	isToolInputStartPart,
	isToolResultPart,
} from "@/convex/types";
import { Markdown } from "@lightfast/ui/components/ui/markdown";
import type React from "react";
import { ToolCallRenderer } from "../tools/tool-call-renderer";
import { MessageLayout } from "./message-layout";
import { StreamingReasoningDisplay } from "./streaming-reasoning-display";

export interface MessageItemProps {
	message: Doc<"messages">;
	showActions?: boolean;
	isReadOnly?: boolean;
	actions?: React.ReactNode;
	forceActionsVisible?: boolean;
}

export function MessageItem({
	message,
	showActions = true,
	isReadOnly = false,
	actions,
	forceActionsVisible = false,
}: MessageItemProps) {
	// Extract reasoning content and check for reasoning parts
	const reasoningParts = message.parts?.filter(isReasoningPart) || [];
	const hasReasoningParts = reasoningParts.length > 0;
	const reasoningContent = reasoningParts.map((part) => part.text).join("\n\n");

	// Check if message has actual text content (not just reasoning)
	const hasTextContent =
		message.parts &&
		message.parts.length > 0 &&
		message.parts.some(
			(part) => isTextPart(part) && part.text && part.text.trim().length > 0,
		);

	// Determine streaming state
	const isStreaming =
		message.status === "submitted" || message.status === "streaming";
	const isAssistant = message.role === "assistant";

	// Content component
	const content = (() => {
		// For assistant messages that are streaming or just submitted
		if (isAssistant && isStreaming && !hasTextContent) {
			// Show reasoning display which handles both thinking and reasoning states
			return (
				<StreamingReasoningDisplay
					isStreaming={isStreaming}
					hasContent={!!hasTextContent}
					reasoningContent={reasoningContent}
					hasReasoningParts={hasReasoningParts}
				/>
			);
		}

		// If message has parts, render them (even if empty initially)
		if (message.parts && message.parts.length > 0) {
			// First, sort all parts by timestamp if available
			const sortedParts = [...message.parts].sort((a, b) => {
				const aTime = "timestamp" in a ? a.timestamp : 0;
				const bTime = "timestamp" in b ? b.timestamp : 0;
				return aTime - bTime; // Earliest first to maintain chronological order
			});

			// Group tool-related parts by toolCallId to track their state
			const toolStateMap = new Map<
				string,
				{
					latestPart: DbMessagePart;
					allParts: DbMessagePart[];
				}
			>();

			// Track which tool calls have been rendered
			const renderedToolCalls = new Set<string>();

			// Build tool state map
			for (const part of sortedParts) {
				if (
					isToolCallPart(part) ||
					isToolInputStartPart(part) ||
					isToolResultPart(part)
				) {
					const toolCallId = part.toolCallId;
					if (!toolStateMap.has(toolCallId)) {
						toolStateMap.set(toolCallId, {
							latestPart: part,
							allParts: [part],
						});
					} else {
						const existing = toolStateMap.get(toolCallId);
						if (existing) {
							existing.allParts.push(part);
							// Update latest part based on timestamp
							const existingTime =
								"timestamp" in existing.latestPart
									? existing.latestPart.timestamp
									: 0;
							const newTime = "timestamp" in part ? part.timestamp : 0;
							if (newTime > existingTime) {
								existing.latestPart = part;
							}
						}
					}
				}
			}

			// Check if we only have empty text parts and no tools
			const hasNonEmptyContent = sortedParts.some(
				(part) =>
					(isTextPart(part) && part.text && part.text.trim().length > 0) ||
					isToolCallPart(part) ||
					isToolInputStartPart(part) ||
					isToolResultPart(part),
			);

			if (
				!hasNonEmptyContent &&
				(message.status === "submitted" || message.status === "streaming")
			) {
				// Show just the cursor while waiting for content
				return (
					<div className="h-5">
						<span className="inline-block w-2 h-4 bg-current animate-pulse opacity-70" />
					</div>
				);
			}

			return (
				<div className="space-y-2">
					{/* Show reasoning display if there are reasoning parts */}
					{isAssistant && hasReasoningParts && (
						<StreamingReasoningDisplay
							isStreaming={isStreaming}
							hasContent={!!hasTextContent}
							reasoningContent={reasoningContent}
							hasReasoningParts={hasReasoningParts}
						/>
					)}

					{/* Render parts in their exact order */}
					{sortedParts.map((part, index) => {
						// Skip reasoning parts as they're handled by StreamingReasoningDisplay
						if (isReasoningPart(part)) {
							return null;
						}

						// Handle text parts
						if (isTextPart(part)) {
							// Skip empty text parts
							if (!part.text || part.text.trim().length === 0) {
								return null;
							}
							return (
								<div key={`${message._id}-text-${index}`}>
									{message.role === "assistant" ? (
										<Markdown className="text-sm">{part.text}</Markdown>
									) : (
										<div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
											{part.text}
										</div>
									)}
								</div>
							);
						}

						// Handle tool-related parts
						if (
							isToolCallPart(part) ||
							isToolInputStartPart(part) ||
							isToolResultPart(part)
						) {
							const toolCallId = part.toolCallId;

							// Only render the tool once (when we first encounter it)
							if (renderedToolCalls.has(toolCallId)) {
								return null;
							}

							renderedToolCalls.add(toolCallId);

							// Get the latest state for this tool
							const toolState = toolStateMap.get(toolCallId);
							if (!toolState) {
								return null;
							}

							// TODO: Find associated error part when toolCallId is added to errors
							const errorPart = undefined;

							return (
								<div key={`${message._id}-tool-${toolCallId}`}>
									<ToolCallRenderer
										toolCall={
											toolState.latestPart as
												| DbToolCallPart
												| DbToolInputStartPart
												| DbToolResultPart
										}
										error={errorPart}
									/>
								</div>
							);
						}

						// Handle error parts
						if (isErrorPart(part)) {
							// TODO: Once toolCallId is added to error parts, this should be handled
							// with the associated tool call above
							return null;
						}

						// Any other part types we don't handle yet
						return null;
					})}
				</div>
			);
		}

		// No parts, no content
		return null;
	})();

	// Timestamp - disabled for now
	const timestamp = undefined;

	// Actions (only for assistant messages in interactive mode)
	const shouldDisableActions =
		message.status === "streaming" || message.status === "submitted";

	const messageActions =
		!isReadOnly &&
		showActions &&
		message.role === "assistant" &&
		!shouldDisableActions
			? actions
			: undefined;

	return (
		<MessageLayout
			content={content}
			timestamp={timestamp}
			actions={messageActions}
			role={message.role}
			forceActionsVisible={forceActionsVisible}
		/>
	);
}
