"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { Markdown } from "@lightfast/ui/components/ui/markdown";
import type React from "react";
import { MessageLayout } from "./message-layout";
import { ThinkingIndicator } from "./thinking-indicator";

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
	// Determine if we should show thinking indicator
	const hasContent =
		message.parts &&
		message.parts.length > 0 &&
		message.parts.some(
			(part) =>
				part.type === "text" && part.text && part.text.trim().length > 0,
		);

	// Show thinking only for assistant messages that are actively streaming and have no content
	const showThinking =
		message.role === "assistant" &&
		!hasContent &&
		message.status === "streaming";

	// Content component
	const content = (() => {
		// Show only thinking indicator if no parts yet
		if (showThinking) {
			return <ThinkingIndicator />;
		}

		// If message has parts, render them (even if empty initially)
		if (message.parts && message.parts.length > 0) {
			// If we have parts but they're all empty, show a minimal placeholder to prevent layout shift
			const allPartsEmpty = !message.parts.some(
				(part) => part.type === "text" && part.text && part.text.length > 0,
			);

			if (allPartsEmpty && message.status === "streaming") {
				// Show just the cursor while waiting for content
				return (
					<div className="h-5">
						<span className="inline-block w-2 h-4 bg-current animate-pulse opacity-70" />
					</div>
				);
			}

			return (
				<div className="space-y-2">
					{message.parts.map((part, index) => {
						if (part.type === "text") {
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
						}

						// @biome-ignore lint/suspicious/noCommentText: TODO: Handle tool calls when needed
						// Tool calls will be handled here in the future
						// if (part.type.startsWith("tool-")) { ... }

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
