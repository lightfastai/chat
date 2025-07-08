"use client";

import {
	ScrollContainer,
	useScrollContainer,
} from "@lightfast/ui/components/chat/scroll-container";
import { Button } from "@lightfast/ui/components/ui/button";
import { ChevronDown } from "lucide-react";
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

// Separate component to access ScrollContainer context
function ScrollToBottomButton() {
	const { isAtBottom, scrollToBottom } = useScrollContainer();

	if (isAtBottom) return null;

	return (
		<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
			<Button
				type="button"
				onClick={() => scrollToBottom()}
				variant="secondary"
				size="icon"
				className="h-8 w-8 shadow-lg hover:shadow-xl transition-all duration-200"
				aria-label="Scroll to bottom"
			>
				<ChevronDown className="w-4 h-4" />
			</Button>
		</div>
	);
}

export function ChatMessages({ dbMessages, uiMessages }: ChatMessagesProps) {
	// Find the streaming message from uiMessages
	let streamingVercelMessage: LightfastUIMessage | undefined;
	if (dbMessages && dbMessages.length > 0 && uiMessages.length > 0) {
		const lastVercelMessage = uiMessages[
			uiMessages.length - 1
		] as LightfastUIMessage;
		const matchingDbMessage = dbMessages.find(
			(msg) =>
				msg._id === lastVercelMessage.metadata?.dbId &&
				msg.status === "streaming",
		);
		if (matchingDbMessage) {
			streamingVercelMessage = lastVercelMessage;
		}
	}

	const processedMessages = useProcessedMessages(dbMessages);
	const streamingMessageParts = useStreamingMessageParts(
		streamingVercelMessage,
	);

	// Handle empty state
	if (!dbMessages || dbMessages.length === 0) {
		return (
			<ScrollContainer
				className="relative flex-1 min-h-0"
				initialPosition="end"
			>
				<div className="p-2 md:p-4 pb-24">
					<div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
						{/* Empty state */}
					</div>
				</div>
				{/* Scroll to bottom button */}
				<ScrollToBottomButton />
			</ScrollContainer>
		);
	}

	return (
		<ScrollContainer className="relative flex-1 min-h-0" initialPosition="end">
			<div className="p-2 md:p-4 pb-24">
				<div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
					{dbMessages.map((message) => {
						// For streaming messages, use memoized Vercel data directly
						if (
							message.status === "streaming" &&
							streamingVercelMessage &&
							streamingVercelMessage.metadata?.dbId === message._id &&
							streamingMessageParts
						) {
							const streamingMessage = {
								...message,
								parts: streamingMessageParts,
							};
							return (
								<MessageDisplay key={message._id} message={streamingMessage} />
							);
						}

						const processedMessage =
							processedMessages.get(message._id) || message;
						return (
							<MessageDisplay key={message._id} message={processedMessage} />
						);
					})}
				</div>
			</div>

			{/* Scroll to bottom button */}
			<ScrollToBottomButton />
		</ScrollContainer>
	);
}
