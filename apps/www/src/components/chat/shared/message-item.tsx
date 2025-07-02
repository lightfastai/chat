"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { mergeTextParts } from "@/hooks/use-merged-messages";
import { Markdown } from "@lightfast/ui/components/ui/markdown";
import type React from "react";
import { MessageLayout } from "./message-layout";
import { ThinkingIndicator } from "./thinking-indicator";

export interface MessageItemProps {
	message: Doc<"messages">;
	status?: "ready" | "streaming" | "submitted" | "error";
	showActions?: boolean;
	isReadOnly?: boolean;
	actions?: React.ReactNode;
	forceActionsVisible?: boolean;
	isLastAssistantMessage?: boolean;
}

export function MessageItem({
	message,
	showActions = true,
	isReadOnly = false,
	actions,
	forceActionsVisible = false,
	status,
	isLastAssistantMessage = false,
}: MessageItemProps) {
	// Content component
	const content = (
		<div className="space-y-1">
			{/* Show thinking indicator when status is submitted */}
			{status === "submitted" && isLastAssistantMessage && (
				<div className="mb-2">
					<ThinkingIndicator />
				</div>
			)}

			{/* Message body */}
			<div className="text-sm leading-relaxed">
				{(() => {
					// If message has parts, render them
					if (message.parts && message.parts.length > 0) {
						const mergedParts = mergeTextParts(message.parts);

						return (
							<div className="space-y-2">
								{mergedParts.map((part, index) => {
									if (part.type === "text") {
										return (
											<div key={`text-${index}`}>
												{message.role === "assistant" ? (
													<Markdown className="text-sm">{part.text}</Markdown>
												) : (
													<div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
														{part.text}
													</div>
												)}
												{/* Show streaming cursor for last text part */}
												{status === "streaming" &&
													index === mergedParts.length - 1 && (
														<span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
													)}
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
				})()}
			</div>
		</div>
	);

	// Timestamp - disabled for now
	const timestamp = undefined;

	// Actions (only for assistant messages in interactive mode)
	const shouldDisableActions =
		isLastAssistantMessage &&
		(status === "streaming" || status === "submitted");

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
