"use client";

import { getMessageParts } from "@/lib/message-parts";
import { Markdown } from "@lightfast/ui/components/ui/markdown";
import { cn } from "@lightfast/ui/lib/utils";
import type React from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { ToolCallRenderer } from "../tools/tool-call-renderer";
import { AssistantMessageHeader } from "./assistant-message-header";
import { MessageLayout } from "./message-layout";

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
					thinkingStartedAt={message.thinkingStartedAt}
					thinkingCompletedAt={message.thinkingCompletedAt}
					streamingText={displayText}
					usage={message.usage}
					hasParts={hasParts}
					message={message}
				/>
			)}

			{/* Reasoning content is now handled by AssistantMessageHeader via StreamingReasoningDisplay */}

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
													{isAssistant ? (
														<Markdown className="text-sm">{part.text}</Markdown>
													) : (
														<div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
															{part.text}
														</div>
													)}
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
					}
					// Legacy text rendering for messages without parts
					return displayText ? (
						<>
							{isAssistant ? (
								<Markdown className="text-sm">{displayText}</Markdown>
							) : (
								<div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
									{displayText}
								</div>
							)}
							{isStreaming && !isComplete && (
								<span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
							)}
						</>
					) : null;
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
