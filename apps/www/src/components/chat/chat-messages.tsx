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
	const [isNearBottom, setIsNearBottom] = useState(true);
	const [isUserScrolling, setIsUserScrolling] = useState(false);
	const lastMessageCountRef = useRef(dbMessages?.length || 0);
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastScrollPositionRef = useRef(0);

	// Check if user is near bottom of scroll area
	const checkIfNearBottom = useCallback(() => {
		if (!viewportRef.current) return true;

		const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
		const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
		// Consider "near bottom" if within 50px of the bottom (reduced from 100px)
		return distanceFromBottom < 50;
	}, []);

	// Smooth scroll to bottom
	const scrollToBottom = useCallback((smooth = true) => {
		if (!viewportRef.current) return;

		viewportRef.current.scrollTo({
			top: viewportRef.current.scrollHeight,
			behavior: smooth ? "smooth" : "auto",
		});
	}, []);

	// Set up viewport ref when component mounts
	useEffect(() => {
		if (scrollAreaRef.current) {
			// Find the viewport element within the ScrollArea
			const viewport = scrollAreaRef.current.querySelector(
				'[data-slot="scroll-area-viewport"]',
			);
			if (viewport instanceof HTMLDivElement) {
				viewportRef.current = viewport;

				// Set up scroll listener to track if user is near bottom and detect user scrolling
				const handleScroll = () => {
					const currentScrollTop = viewport.scrollTop;
					const scrollDelta = currentScrollTop - lastScrollPositionRef.current;

					// Detect if user is scrolling up (negative delta) or manually scrolling
					if (scrollDelta < -5) {
						setIsUserScrolling(true);

						// Clear any existing timeout
						if (scrollTimeoutRef.current) {
							clearTimeout(scrollTimeoutRef.current);
						}

						// Reset user scrolling flag after 2 seconds of no scrolling
						scrollTimeoutRef.current = setTimeout(() => {
							setIsUserScrolling(false);
						}, 2000);
					}

					lastScrollPositionRef.current = currentScrollTop;
					setIsNearBottom(checkIfNearBottom());
				};

				viewport.addEventListener("scroll", handleScroll, { passive: true });
				return () => {
					viewport.removeEventListener("scroll", handleScroll);
					if (scrollTimeoutRef.current) {
						clearTimeout(scrollTimeoutRef.current);
					}
				};
			}
		}
	}, [checkIfNearBottom]);

	// Auto-scroll when new messages arrive
	useEffect(() => {
		if (!dbMessages || !dbMessages.length) return;

		const hasNewMessage = dbMessages.length > lastMessageCountRef.current;
		lastMessageCountRef.current = dbMessages.length;

		// Check if the last message is streaming
		const lastMessage = dbMessages[dbMessages.length - 1];
		const isStreaming =
			lastMessage?.role === "assistant" && lastMessage?.status === "streaming";

		// Auto-scroll if:
		// 1. User is NOT actively scrolling
		// 2. User is near bottom
		// 3. There's a new message OR streaming
		if (!isUserScrolling && isNearBottom && (hasNewMessage || isStreaming)) {
			// Use instant scroll for new messages, smooth for streaming updates
			scrollToBottom(!hasNewMessage);
		}

		// If there's a new message and user is scrolling, reset the user scrolling flag
		// This ensures they see their own messages
		if (hasNewMessage && dbMessages[dbMessages.length - 1]?.role === "user") {
			setIsUserScrolling(false);
			scrollToBottom(false);
		}
	}, [dbMessages, isNearBottom, isUserScrolling, scrollToBottom]);

	// Scroll to bottom on initial load
	useEffect(() => {
		scrollToBottom(false);
	}, [scrollToBottom]);

	// Find the streaming message from uiMessages
	let streamingVercelMessage: LightfastUIMessage | undefined;
	if (dbMessages && dbMessages.length > 0 && uiMessages.length > 0) {
		// The last message in uiMessages should be the streaming one
		const lastVercelMessage = uiMessages[
			uiMessages.length - 1
		] as LightfastUIMessage;
		// Check if there's a matching database message that's streaming
		const matchingDbMessage = dbMessages.find(
			(msg) =>
				msg._id === lastVercelMessage.metadata?.dbId &&
				msg.status === "streaming",
		);
		if (matchingDbMessage) {
			streamingVercelMessage = lastVercelMessage;
		}
	}

	// Use the custom hook for efficient message processing
	const processedMessages = useProcessedMessages(dbMessages);

	// Use efficient streaming message parts conversion with caching
	const streamingMessageParts = useStreamingMessageParts(
		streamingVercelMessage,
	);

	// Handle empty state
	if (!dbMessages || dbMessages.length === 0) {
		return (
			<ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
				<div className="p-2 md:p-4 pb-16">
					<div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
						{/* Empty state */}
					</div>
				</div>
			</ScrollArea>
		);
	}

	return (
		<ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
			<div className="p-2 md:p-4 pb-16">
				<div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
					{dbMessages.map((message) => {
						// For streaming messages, use memoized Vercel data directly
						if (
							message.status === "streaming" &&
							streamingVercelMessage &&
							streamingVercelMessage.metadata?.dbId === message._id &&
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

			{/* Scroll to bottom button when user has scrolled up */}
			{!isNearBottom && dbMessages.length > 0 && (
				<button
					type="button"
					onClick={() => {
						setIsUserScrolling(false);
						scrollToBottom();
					}}
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
