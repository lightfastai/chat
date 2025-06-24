"use client";

import { Markdown } from "@lightfast/ui/components/ui/markdown";
import { cn } from "@lightfast/ui/lib/utils";
import React from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { getMessageParts } from "@/lib/message-parts";
import { AssistantMessageHeader } from "./assistant-message-header";
import { MessageAvatar } from "./message-avatar";
import { MessageLayout } from "./message-layout";
import { ThinkingContent } from "./thinking-content";

type Message = Doc<"messages"> & { _streamId?: string | null };

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
}

export function MessageItem({
	message,
	owner,
	currentUser,
	showThinking = true,
	showActions = true,
	isReadOnly = false,
	modelName,
	streamingText,
	isStreaming,
	isComplete,
	actions,
	className,
}: MessageItemProps) {
	const isAssistant = message.messageType === "assistant";

	// Calculate thinking duration
	const thinkingDuration = React.useMemo(() => {
		if (message.thinkingStartedAt && message.thinkingCompletedAt) {
			return message.thinkingCompletedAt - message.thinkingStartedAt;
		}
		return null;
	}, [message.thinkingStartedAt, message.thinkingCompletedAt]);

	// Determine display user based on context
	const displayUser = isReadOnly ? owner : currentUser;

	// Avatar component
	const avatar = (
		<MessageAvatar
			messageType={message.messageType}
			userImage={displayUser?.image || undefined}
			userName={displayUser?.name || undefined}
		/>
	);

	// Determine what text to show
	const displayText =
		isStreaming && streamingText ? streamingText : message.body;

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
					usage={message.usage}
				/>
			)}

			{/* Thinking content */}
			{showThinking &&
				message.hasThinkingContent &&
				message.thinkingContent && (
					<ThinkingContent
						content={message.thinkingContent}
						duration={thinkingDuration}
					/>
				)}

			{/* Message body - unified for both read-only and interactive modes */}
			<div className="text-sm leading-relaxed">
				{/* Parts-based rendering */}
				{message.parts && message.parts.length > 0 ? (
					<>
						{getMessageParts(message).map((part, index) => {
							const isLastPart = index === getMessageParts(message).length - 1;
							
							if (part.type === "text") {
								return (
									<React.Fragment key={index}>
										<Markdown className="text-sm">{part.text}</Markdown>
										{isStreaming && !isComplete && isLastPart && (
											<span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
										)}
									</React.Fragment>
								);
							}
							
							// Tool call parts - render as code block for now
							if (part.type === "tool-call") {
								return (
									<div key={index} className="my-2">
										<pre className="p-2 rounded bg-muted text-xs overflow-x-auto">
											<code>
												{JSON.stringify(
													{
														type: part.type,
														toolName: part.toolName,
														toolCallId: part.toolCallId,
														state: part.state,
														args: part.args,
														result: part.result,
													},
													null,
													2
												)}
											</code>
										</pre>
									</div>
								);
							}
							
							return null;
						})}
					</>
				) : (
					// Legacy text rendering fallback
					displayText ? (
						<>
							<Markdown className="text-sm">{displayText}</Markdown>
							{isStreaming && !isComplete && (
								<span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
							)}
						</>
					) : null
				)}
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
		!message._streamId
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
		/>
	);
}
