"use client";

import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
import { useRef, useEffect } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
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
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const viewportRef = useRef<HTMLDivElement | null>(null);

	// Use the hook approach of use-stick-to-bottom
	const { scrollRef, contentRef, isAtBottom, scrollToBottom } =
		useStickToBottom({
			resize: "smooth",
			initial: "instant",
		});

	// Connect refs to ScrollArea viewport
	useEffect(() => {
		if (scrollAreaRef.current) {
			const viewport = scrollAreaRef.current.querySelector(
				'[data-slot="scroll-area-viewport"]',
			);
			if (viewport instanceof HTMLDivElement) {
				viewportRef.current = viewport;
				// Connect use-stick-to-bottom to the ScrollArea viewport
				if (scrollRef) {
					Object.assign(scrollRef, { current: viewport });
				}
			}
		}
	}, [scrollRef]);

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
			<ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
				<div ref={contentRef} className="p-2 md:p-4 pb-16">
					<div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
						{/* Empty state */}
					</div>
				</div>
				{!isAtBottom && (
					<button
						type="button"
						onClick={() => scrollToBottom()}
						className="absolute bottom-6 left-1/2 -translate-x-1/2 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
						aria-label="Scroll to bottom"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M19 14l-7 7m0 0l-7-7m7 7V3"
							/>
						</svg>
					</button>
				)}
			</ScrollArea>
		);
	}

	return (
		<ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
			<div ref={contentRef} className="p-2 md:p-4 pb-16">
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
			{!isAtBottom && dbMessages.length > 0 && (
				<button
					type="button"
					onClick={() => scrollToBottom()}
					className="absolute bottom-6 left-1/2 -translate-x-1/2 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
					aria-label="Scroll to bottom"
				>
					<svg
						className="w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 14l-7 7m0 0l-7-7m7 7V3"
						/>
					</svg>
				</button>
			)}
		</ScrollArea>
	);
}