"use client";

import { extractUIMessageText } from "@/lib/ai/message-converters";
import { Markdown } from "@lightfast/ui/components/ui/markdown";
import { cn } from "@lightfast/ui/lib/utils";
import type { UIMessage } from "ai";
import type React from "react";
import { ToolCallRenderer } from "../tools/tool-call-renderer";
import { AssistantMessageHeader } from "./assistant-message-header";
import { MessageLayout } from "./message-layout";
import { ThinkingIndicator } from "./thinking-indicator";

// Helper to group consecutive text parts
function groupConsecutiveTextParts(parts: any[]): any[] {
	console.log("[groupConsecutiveTextParts] Input parts:", parts);
	const groupedParts: any[] = [];
	let currentTextGroup = "";

	for (const part of parts) {
		if (part.type === "text") {
			// Add defensive check for text property
			const partText = (part as any).text || "";
			currentTextGroup += partText;
		} else {
			// Flush any accumulated text before adding non-text part
			if (currentTextGroup) {
				groupedParts.push({
					type: "text",
					text: currentTextGroup,
				});
				currentTextGroup = "";
			}

			// Add the non-text part (including reasoning parts)
			groupedParts.push(part);
		}
	}

	// Don't forget to add any remaining text at the end
	if (currentTextGroup) {
		groupedParts.push({
			type: "text",
			text: currentTextGroup,
		});
	}

	console.log("[groupConsecutiveTextParts] Output parts:", groupedParts);
	return groupedParts;
}

// Map UI tool state to our expected format
function mapUIToolState(
	state:
		| "input-streaming"
		| "input-available"
		| "output-available"
		| "output-error",
): "partial-call" | "call" | "result" {
	switch (state) {
		case "input-streaming":
			return "partial-call";
		case "input-available":
			return "call";
		case "output-available":
		case "output-error":
			return "result";
		default:
			return "call";
	}
}

export interface MessageItemProps {
	message: UIMessage;
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
	isStreaming,
	isComplete,
	actions,
	className,
	forceActionsVisible = false,
}: MessageItemProps) {
	const isAssistant = message.role === "assistant";
	const metadata = (message.metadata as any) || {};

	// Avatar component - removed to clean up UI
	const avatar = null;

	// Determine what text to show
	const displayText = extractUIMessageText(message);

	// Check if message has parts
	const hasParts = message.parts && message.parts.length > 0;

	// Debug logging
	console.log("[MessageItem] message:", message);
	console.log("[MessageItem] displayText:", displayText);
	console.log("[MessageItem] hasParts:", hasParts);
	console.log("[MessageItem] message.parts:", message.parts);

	// Content component
	const content = (
		<div className={cn("space-y-1", className)}>
			{/* Assistant message header with consistent layout */}
			{isAssistant && (
				<AssistantMessageHeader
					modelName={modelName}
					usedUserApiKey={metadata.usedUserApiKey}
					isStreaming={isStreaming}
					thinkingStartedAt={metadata.thinkingStartedAt}
					thinkingCompletedAt={metadata.thinkingCompletedAt}
					streamingText={displayText}
					usage={metadata.usage}
					hasParts={hasParts}
					message={message}
				/>
			)}

			{/* Reasoning content is now handled by AssistantMessageHeader via StreamingReasoningDisplay */}

			{/* Message body - use parts-based rendering for streaming or final display */}
			<div className="text-sm leading-relaxed">
				{(() => {
					// If message has parts, use parts-based rendering
					if (hasParts) {
						// Group consecutive text parts together to prevent line breaks
						const parts = groupConsecutiveTextParts(message.parts);

						// Filter out reasoning parts since they're handled separately
						const displayParts = parts.filter(
							(part) => part.type !== "reasoning",
						);

						return (
							<div className="space-y-2">
								{displayParts.map((part, index) => {
									// Create a unique key based on part content
									const partKey = part.type.startsWith("tool-")
										? `tool-${(part as any).toolCallId || index}`
										: `text-${index}`;

									if (part.type === "text") {
										// Add defensive check for text property
										const textContent = (part as any).text || "";
										console.log("[MessageItem] Rendering text part:", {
											partKey,
											textContent,
										});
										return (
											<div key={partKey}>
												{isAssistant ? (
													<Markdown className="text-sm">{textContent}</Markdown>
												) : (
													<div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
														{textContent}
													</div>
												)}
												{isStreaming &&
													!isComplete &&
													index === displayParts.length - 1 && (
														<span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
													)}
											</div>
										);
									} else if (part.type.startsWith("tool-")) {
										// Convert UI tool part to expected format
										const toolName = part.type.substring(5);
										const toolCall = {
											type: "tool-call" as const,
											toolCallId: (part as any).toolCallId,
											toolName,
											args: (part as any).input || {},
											result: (part as any).output,
											state: mapUIToolState((part as any).state),
										};
										return (
											<ToolCallRenderer key={partKey} toolCall={toolCall} />
										);
									} else if (part.type === "thinking-indicator") {
										// Show thinking indicator
										const isThinkingModel = (part as any).isThinkingModel || false;
										const label = isThinkingModel ? "Thinking" : "Thinking";
										return (
											<div key={partKey} className="mb-2">
												<ThinkingIndicator label={label} />
											</div>
										);
									}
									return null;
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
		metadata.isComplete !== false &&
		!metadata.isStreaming
			? actions
			: undefined;

	return (
		<MessageLayout
			avatar={avatar}
			content={content}
			timestamp={timestamp}
			actions={messageActions}
			messageType={
				message.role === "user"
					? "user"
					: message.role === "assistant"
						? "assistant"
						: "system"
			}
			className={undefined}
			forceActionsVisible={forceActionsVisible}
		/>
	);
}
