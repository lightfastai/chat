"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { 
	isReasoningPart, 
	isTextPart, 
	isToolCallPart,
	isToolInputStartPart,
	isToolResultPart,
	isErrorPart,
	type DbMessagePart
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
			// Group tool-related parts by toolCallId
			const toolGroups = new Map<string, DbMessagePart[]>();
			const textParts: DbMessagePart[] = [];
			const otherParts: DbMessagePart[] = [];

			// Sort parts into groups
			for (const part of message.parts) {
				if (isTextPart(part)) {
					textParts.push(part);
				} else if (
					isToolCallPart(part) || 
					isToolInputStartPart(part) || 
					isToolResultPart(part)
				) {
					const toolCallId = part.toolCallId;
					if (!toolGroups.has(toolCallId)) {
						toolGroups.set(toolCallId, []);
					}
					toolGroups.get(toolCallId)!.push(part);
				} else if (!isReasoningPart(part)) {
					// Don't include reasoning parts here as they're handled separately
					otherParts.push(part);
				}
			}

			// Check if all text parts are empty
			const allTextPartsEmpty = !textParts.some(
				(part) => isTextPart(part) && part.text && part.text.length > 0,
			);

			if (
				allTextPartsEmpty &&
				toolGroups.size === 0 &&
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

					{/* Render text parts first */}
					{textParts.map((part, index) => {
						if (!isTextPart(part)) return null;
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
					})}

					{/* Render tool groups */}
					{Array.from(toolGroups.entries()).map(([toolCallId, parts]) => {
						// Sort parts by timestamp to get the latest state
						const sortedParts = [...parts].sort((a, b) => {
							const aTime = "timestamp" in a ? a.timestamp : 0;
							const bTime = "timestamp" in b ? b.timestamp : 0;
							return bTime - aTime; // Latest first
						});

						// Get the most recent part to represent current state
						const latestPart = sortedParts[0];
						
						// Check if there's an error for this tool
						const errorPart = otherParts.find(
							(part) => isErrorPart(part) && 
							// TODO: Add toolCallId to error parts to properly associate them
							false
						);

						return (
							<div key={`${message._id}-tool-${toolCallId}`}>
								<ToolCallRenderer 
									toolCall={latestPart as any} 
									error={errorPart && isErrorPart(errorPart) ? errorPart : undefined}
								/>
							</div>
						);
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
