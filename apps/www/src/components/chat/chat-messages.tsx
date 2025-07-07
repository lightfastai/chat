"use client";

import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
import { useCallback, useEffect, useRef, useState } from "react";
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
	const contentRef = useRef<HTMLDivElement>(null);
	const [isAtBottom, setIsAtBottom] = useState(true);

	// Find viewport and set up scroll monitoring
	useEffect(() => {
		if (scrollAreaRef.current) {
			const viewport = scrollAreaRef.current.querySelector(
				"[data-radix-scroll-area-viewport]",
			);
			if (viewport instanceof HTMLDivElement) {
				viewportRef.current = viewport;

				// Check if at bottom
				const checkIfAtBottom = () => {
					if (viewport) {
						const { scrollTop, scrollHeight, clientHeight } = viewport;
						const isBottom =
							Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
						setIsAtBottom(isBottom);
					}
				};

				// Initial check
				checkIfAtBottom();

				// Listen for scroll events
				viewport.addEventListener("scroll", checkIfAtBottom);

				return () => {
					viewport.removeEventListener("scroll", checkIfAtBottom);
				};
			}
		}
	}, []);

	// Auto-scroll to bottom when new messages arrive (only if already at bottom)
	useEffect(() => {
		if (
			isAtBottom &&
			viewportRef.current &&
			dbMessages &&
			dbMessages.length > 0
		) {
			const viewport = viewportRef.current;
			setTimeout(() => {
				viewport.scrollTo({
					top: viewport.scrollHeight,
					behavior: "smooth",
				});
			}, 50);
		}
	}, [dbMessages, isAtBottom]);

	// Scroll to bottom function
	const scrollToBottom = useCallback(() => {
		if (viewportRef.current) {
			const viewport = viewportRef.current;
			viewport.scrollTo({
				top: viewport.scrollHeight,
				behavior: "smooth",
			});
			setIsAtBottom(true);
		}
	}, []);

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

			{/* Scroll to bottom button */}
			{!isAtBottom && dbMessages.length > 0 && (
				<button
					type="button"
					onClick={scrollToBottom}
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
