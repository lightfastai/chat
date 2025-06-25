"use client";

import { Markdown } from "@lightfast/ui/components/ui/markdown";
import { cn } from "@lightfast/ui/lib/utils";
import React from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { AssistantMessageHeader } from "./assistant-message-header";
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

	// Avatar component - removed to clean up UI
	const avatar = null;

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
					streamingText={streamingText}
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
				{displayText ? (
					<>
						<Markdown className="text-sm">{displayText}</Markdown>
						{isStreaming && !isComplete && (
							<span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
						)}
					</>
				) : null}
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
