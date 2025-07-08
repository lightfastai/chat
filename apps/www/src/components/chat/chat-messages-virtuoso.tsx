"use client";

import {
	VirtuosoMessageList,
	VirtuosoMessageListLicense,
	type VirtuosoMessageListMethods,
	type VirtuosoMessageListProps,
} from "@virtuoso.dev/message-list";
import { useEffect, useMemo, useRef } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import type { LightfastUIMessage } from "../../hooks/convertDbMessagesToUIMessages";
import { useProcessedMessages } from "../../hooks/use-processed-messages";
import { useStreamingMessageParts } from "../../hooks/use-streaming-message-parts";
import { MessageDisplay } from "./message-display";

interface ChatMessagesProps {
	dbMessages: Doc<"messages">[] | null | undefined;
	uiMessages: LightfastUIMessage[];
	emptyState?: {
		icon?: React.ReactNode;
		title?: string;
		description?: string;
	};
}

interface MessageData {
	key: string;
	message: Doc<"messages">;
	isStreaming: boolean;
}

const ItemContent: VirtuosoMessageListProps<MessageData, null>["ItemContent"] =
	({ data }) => {
		return <MessageDisplay message={data.message} />;
	};

export function ChatMessagesVirtuoso({
	dbMessages,
	uiMessages,
	emptyState,
}: ChatMessagesProps) {
	const virtuoso = useRef<VirtuosoMessageListMethods<MessageData>>(null);

	// Use the updated hook that finds the streaming message
	const { streamingMessage, streamingMessageParts } = useStreamingMessageParts(
		dbMessages,
		uiMessages,
	);

	// Use the custom hook for efficient message processing
	const processedMessages = useProcessedMessages(dbMessages);

	// Convert messages to Virtuoso format
	const messages = useMemo(() => {
		if (!dbMessages || dbMessages.length === 0) return [];

		return dbMessages.map((message) => {
			// For streaming messages, use memoized Vercel data directly
			if (
				message.status === "streaming" &&
				streamingMessage &&
				streamingMessage.metadata?.dbId === message._id &&
				streamingMessageParts
			) {
				// Use memoized streaming data without reprocessing
				const streamingMessageData = {
					...message,
					parts: streamingMessageParts,
				};
				return {
					key: message._id,
					message: streamingMessageData,
					isStreaming: true,
				};
			}

			// Use pre-processed message from cache
			const processedMessage = processedMessages.get(message._id) || message;
			return {
				key: message._id,
				message: processedMessage,
				isStreaming: false,
			};
		});
	}, [dbMessages, processedMessages, streamingMessage, streamingMessageParts]);

	// Update message list data when messages change
	useEffect(() => {
		if (virtuoso.current && messages.length > 0) {
			// Replace all messages to handle updates
			virtuoso.current.data.replace(messages);
		}
	}, [messages]);

	// Handle new messages (especially for streaming)
	useEffect(() => {
		if (!virtuoso.current || !streamingMessage || !streamingMessageParts) return;

		// Find if we have a streaming message in our list
		const streamingIndex = messages.findIndex(
			(msg) => msg.isStreaming && msg.message._id === streamingMessage.metadata?.dbId
		);

		if (streamingIndex !== -1) {
			// Update the streaming message with smooth scrolling
			virtuoso.current.data.map((item, index) => {
				if (index === streamingIndex && item.isStreaming) {
					return {
						...item,
						message: {
							...item.message,
							parts: streamingMessageParts,
						},
					};
				}
				return item;
			}, "smooth");
		}
	}, [streamingMessage, streamingMessageParts, messages]);

	// Handle empty state
	if (!dbMessages || dbMessages.length === 0) {
		return (
			<div className="flex-1 min-h-0 overflow-hidden">
				<div className="p-2 md:p-4 pb-16 h-full">
					<div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
						{/* Empty state */}
						{emptyState && (
							<div className="flex flex-col items-center justify-center h-full text-center">
								{emptyState.icon && (
									<div className="mb-4">{emptyState.icon}</div>
								)}
								{emptyState.title && (
									<h3 className="text-lg font-semibold">{emptyState.title}</h3>
								)}
								{emptyState.description && (
									<p className="text-sm text-muted-foreground mt-2">
										{emptyState.description}
									</p>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 min-h-0 flex flex-col">
			<VirtuosoMessageListLicense licenseKey="">
				<VirtuosoMessageList<MessageData, null>
					ref={virtuoso}
					style={{ flex: 1 }}
					initialData={messages}
					computeItemKey={({ data }) => data.key}
					ItemContent={ItemContent}
					initialLocation={{
						index: messages.length > 0 ? messages.length - 1 : 0,
						align: "end",
					}}
					increaseViewportBy={200}
					shortSizeAlign="bottom"
					className="px-2 md:px-4"
				/>
			</VirtuosoMessageListLicense>
		</div>
	);
}
