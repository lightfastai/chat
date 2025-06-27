"use client";

import {
	getCombinedReasoningText,
	getMessageParts,
	hasReasoningContent,
} from "@/lib/message-parts";
import { Markdown } from "@lightfast/ui/components/ui/markdown";
import { cn } from "@lightfast/ui/lib/utils";
import React from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { ToolCallRenderer } from "../tools/tool-call-renderer";
import { AssistantMessageHeader } from "./assistant-message-header";
import { MessageLayout } from "./message-layout";
import { ThinkingContent } from "./thinking-content";

type Message = Doc<"messages">;

export interface MessageItemProps {
	message: Message;
	owner?: {
		name?: string | null;
		image?: string | null;
	};
	currentUser?: {
		name?: string | null;
		image?: string | null;
	};
	showThinking?: boolean;
	showActions?: boolean;
	isReadOnly?: boolean;
	modelName?: string;
	streamingText?: string;
	isStreaming?: boolean;
	isComplete?: boolean;
	actions?: React.ReactNode;
	className?: string;
	forceActionsVisible?: boolean;
}

export function MessageItem({
	message,
	showThinking = true,
	showActions = true,
	isReadOnly = false,
	modelName,
	streamingText,
	isStreaming,
	isComplete,
	actions,
	className,
	forceActionsVisible = false,
}: MessageItemProps) {
	const isAssistant = message.messageType === "assistant";

	// Calculate thinking duration
	const thinkingDuration = React.useMemo(() => {
		if (message.thinkingStartedAt && message.thinkingCompletedAt) {
			return message.thinkingCompletedAt - message.thinkingStartedAt;
		}
		return null;
	}, [message.thinkingStartedAt, message.thinkingCompletedAt]);

	// Avatar component - removed to clean up UI
	const avatar = null;

	// Determine what text to show
	const displayText =
		isStreaming && streamingText ? streamingText : message.body;

	// Check if message has parts (new system) vs legacy body-only
	const hasParts = message.parts && message.parts.length > 0;

	// Content component
	const content = (
		<div className={cn("space-y-1", className)}>
			{/* Assistant message header with consistent layout */}
			{isAssistant && (
				<AssistantMessageHeader
					modelName={modelName}
					usedUserApiKey={message.usedUserApiKey}
					isStreaming={isStreaming}
					isComplete={isComplete}
					thinkingStartedAt={message.thinkingStartedAt}
					thinkingCompletedAt={message.thinkingCompletedAt}
					streamingText={displayText}
					usage={message.usage}
					hasParts={hasParts}
					message={message}
				/>
			)}

			{/* Thinking content - use parts-based reasoning content if available */}
			{showThinking &&
				(() => {
					// First check if we have reasoning parts (new system)
					if (hasReasoningContent(message)) {
						const reasoningText = getCombinedReasoningText(message);
						if (reasoningText) {
							return (
								<ThinkingContent
									content={reasoningText}
									duration={thinkingDuration}
									isStreaming={isStreaming}
								/>
							);
						}
					}
					// Fall back to legacy fields for backward compatibility
					else if (message.hasThinkingContent && message.thinkingContent) {
						return (
							<ThinkingContent
								content={message.thinkingContent}
								duration={thinkingDuration}
								isStreaming={isStreaming}
							/>
						);
					}
					return null;
				})()}

			{/* Message body - use parts-based rendering for streaming or final display */}
			<div className="text-sm leading-relaxed">
				{(() => {
					// If message has parts, use parts-based rendering (new system)
					if (hasParts) {
						// Always use grouped parts to prevent line breaks between text chunks
						// The grouping function handles both streaming and completed states
						const parts = getMessageParts(message);

						// Filter out reasoning and control parts since they're handled separately
						const displayParts = parts.filter(
							(part) => part.type !== "reasoning" && part.type !== "control",
						);

						return (
							<div className="space-y-2">
								{displayParts.map((part, index) => {
									// Create a unique key based on part content
									const partKey =
										part.type === "tool-call"
											? `tool-call-${(part as any).toolCallId}`
											: `text-${index}`;

									switch (part.type) {
										case "text":
											return (
												<div key={partKey}>
													<Markdown className="text-sm">{part.text}</Markdown>
													{isStreaming &&
														!isComplete &&
														index === displayParts.length - 1 && (
															<span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
														)}
												</div>
											);
										case "tool-call":
											return <ToolCallRenderer key={partKey} toolCall={part} />;
										default:
											return null;
									}
								})}
							</div>
						);
					} else {
						// Legacy text rendering for messages without parts
						return displayText ? (
							<>
								<Markdown className="text-sm">{displayText}</Markdown>
								{isStreaming && !isComplete && (
									<span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
								)}
							</>
						) : null;
					}
				})()}
			</div>
		</div>
	);

	// Timestamp - disabled for now
	const timestamp = undefined;

	// Actions (only for assistant messages in interactive mode)
	const messageActions =
		!isReadOnly &&
		showActions &&
		isAssistant &&
		message.isComplete !== false &&
		!message.isStreaming
			? actions
			: undefined;

	return (
		<MessageLayout
			avatar={avatar}
			content={content}
			timestamp={timestamp}
			actions={messageActions}
			messageType={message.messageType}
			className={undefined}
			forceActionsVisible={forceActionsVisible}
		/>
	);
}
