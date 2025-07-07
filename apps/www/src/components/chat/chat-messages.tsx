"use client";

import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
import { useEffect, useRef, useState } from "react";
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
	const [isStreaming, setIsStreaming] = useState(false);

	// Use the hook approach of use-stick-to-bottom
	const { scrollRef, contentRef, isAtBottom, scrollToBottom, state } =
		useStickToBottom({
			resize: "smooth",
			initial: "instant",
		});

	// Connect refs to ScrollArea viewport
	useEffect(() => {
		if (scrollAreaRef.current) {
			// Try both possible selectors for the viewport
			let viewport = scrollAreaRef.current.querySelector(
				"[data-radix-scroll-area-viewport]",
			) as HTMLDivElement;

			if (!viewport) {
				viewport = scrollAreaRef.current.querySelector(
					".scroll-area-viewport",
				) as HTMLDivElement;
			}

			if (viewport) {
				// Connect use-stick-to-bottom to the ScrollArea viewport
				if (scrollRef) {
					(scrollRef as React.MutableRefObject<HTMLElement | null>).current =
						viewport;
				}
			}
		}
	}, [scrollRef]);

	// Track streaming state
	useEffect(() => {
		const hasStreamingMessage = dbMessages?.some(
			(msg) => msg.status === "streaming",
		);
		setIsStreaming(hasStreamingMessage || false);
	}, [dbMessages]);

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
			<div className="relative flex-1 min-h-0">
				<ScrollArea className="h-full" ref={scrollAreaRef}>
					<div ref={contentRef} className="p-2 md:p-4 pb-24">
						<div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
							{/* Empty state */}
						</div>
					</div>
				</ScrollArea>
				{!isAtBottom && (
					<button
						type="button"
						onClick={() => scrollToBottom()}
						className="absolute bottom-20 left-1/2 -translate-x-1/2 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 z-10"
						aria-label="Scroll to bottom"
					>
						<svg
							className="w-4 h-4"
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
			</div>
		);
	}

	return (
		<div className="relative flex-1 min-h-0">
			<ScrollArea className="h-full" ref={scrollAreaRef}>
				<div ref={contentRef} className="p-2 md:p-4 pb-24">
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
									<MessageDisplay
										key={message._id}
										message={streamingMessage}
									/>
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
			</ScrollArea>

			{/* Enhanced scroll to bottom button - shows when user has manually scrolled */}
			{!isAtBottom && dbMessages.length > 0 && (
				<button
					type="button"
					onClick={() => scrollToBottom()}
					className={`absolute bottom-20 left-1/2 -translate-x-1/2 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 z-10 ${
						isStreaming && state?.escapedFromLock
							? "bg-orange-500 text-white animate-pulse"
							: "bg-primary text-primary-foreground"
					}`}
					aria-label={
						isStreaming && state?.escapedFromLock
							? "Resume auto-scroll"
							: "Scroll to bottom"
					}
				>
					{isStreaming && state?.escapedFromLock ? (
						<div className="flex items-center gap-2">
							<svg
								className="w-4 h-4"
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
							<span className="text-xs whitespace-nowrap">Resume</span>
						</div>
					) : (
						<svg
							className="w-4 h-4"
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
					)}
				</button>
			)}
		</div>
	);
}
