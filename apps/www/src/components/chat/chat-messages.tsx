"use client";

import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
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

export function ChatMessages({ dbMessages, uiMessages }: ChatMessagesProps) {
	// Use the custom hook for efficient message processing
	const processedMessages = useProcessedMessages(dbMessages);

	// Use efficient streaming message parts conversion with caching
	// This also finds the streaming message from uiMessages
	const { streamingMessage, streamingMessageParts } = useStreamingMessageParts(
		dbMessages,
		uiMessages,
	);

	// Handle empty state
	if (!dbMessages || dbMessages.length === 0) {
		return (
			<ScrollArea className="flex-1 min-h-0">
				<div className="p-2 md:p-4 pb-16">
					<div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
						{/* Empty state */}
					</div>
				</div>
			</ScrollArea>
		);
	}

	return (
		<ScrollArea className="flex-1 min-h-0">
			<div className="p-2 md:p-4 pb-16">
				<div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
					{dbMessages.map((message) => {
						// For streaming messages, use memoized Vercel data directly
						if (
							message.status === "streaming" &&
							streamingMessage &&
							streamingMessage.metadata?.dbId === message._id &&
							streamingMessageParts
						) {
							// Use memoized streaming data without reprocessing
							const streamingMessage = {
								...message,
								parts: streamingMessageParts,
							};
							return (
								<MessageDisplay key={message._id} message={streamingMessage} />
							);
						}

						// Use pre-processed message from cache
						const processedMessage =
							processedMessages.get(message._id) || message;
						return (
							<MessageDisplay key={message._id} message={processedMessage} />
						);
					})}
				</div>
			</div>
		</ScrollArea>
	);
}
