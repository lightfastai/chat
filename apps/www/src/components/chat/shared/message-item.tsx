"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { isReasoningPart, isTextPart, isToolCallPart } from "@/convex/types";
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
	const reasoningContent = reasoningParts
		.map((part) => part.text)
		.join("\n\n");

	// Check if message has actual text content (not just reasoning)
	const hasTextContent =
		message.parts &&
		message.parts.length > 0 &&
		message.parts.some(
			(part) =>
				isTextPart(part) && part.text && part.text.trim().length > 0,
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
			// Filter out text and tool-call parts for display (reasoning is shown separately)
			const displayParts = message.parts.filter(
				(part) => isTextPart(part) || isToolCallPart(part),
			);
			const textParts = displayParts.filter(isTextPart);
			const allTextPartsEmpty = !textParts.some(
				(part) => part.text && part.text.length > 0,
			);

			if (
				allTextPartsEmpty &&
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

					{/* Render text and tool-call parts */}
					{displayParts.map((part, index) => {
						if (isTextPart(part)) {
							return (
								<div key={`${message._id}-text-${index}`}>
									{message.role === "assistant" ? (
										<Markdown className="text-sm">{part.text}</Markdown>
									) : (
										<div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
											{part.text}
										</div>
									)}
									{/* Show streaming cursor for last text part @todo fix. the - 1 part.*/}
									{/* {messageStatus === "streaming" &&
										index === (message.parts?.length || 0) - 1 && (
											<span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
										)} */}
								</div>
							);
						} else if (isToolCallPart(part)) {
							return (
								<div key={`${message._id}-tool-call-${index}`}>
									<ToolCallRenderer toolCall={part} />
								</div>
							);
						}
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
