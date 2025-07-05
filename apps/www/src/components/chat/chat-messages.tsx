"use client";

import type { UIMessage } from "@ai-sdk/react";
import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import type { DbMessagePart } from "../../../convex/types";
import { isReasoningPart, isTextPart } from "../../../convex/types";
import { MessageDisplay } from "./message-display";

/**
 * Process message parts: sort by timestamp, then merge consecutive parts of same type
 */
function processMessageParts(parts: DbMessagePart[]): DbMessagePart[] {
	if (!parts || parts.length === 0) return [];

	// Step 1: Sort all parts by timestamp
	const sortedParts = [...parts].sort((a, b) => {
		const aTimestamp = "timestamp" in a ? a.timestamp : 0;
		const bTimestamp = "timestamp" in b ? b.timestamp : 0;
		return aTimestamp - bTimestamp;
	});

	// Step 2: Merge consecutive parts of the same type
	const mergedParts: DbMessagePart[] = [];

	for (const part of sortedParts) {
		const lastPart = mergedParts[mergedParts.length - 1];

		// Check if we can merge with the previous part
		if (lastPart && lastPart.type === part.type) {
			if (isTextPart(part) && isTextPart(lastPart)) {
				// Merge text parts
				mergedParts[mergedParts.length - 1] = {
					...lastPart,
					text: lastPart.text + part.text,
					timestamp: Math.min(lastPart.timestamp, part.timestamp), // Use earliest timestamp
				};
				continue;
			} else if (isReasoningPart(part) && isReasoningPart(lastPart)) {
				// Merge reasoning parts
				mergedParts[mergedParts.length - 1] = {
					...lastPart,
					text: lastPart.text + part.text,
					timestamp: Math.min(lastPart.timestamp, part.timestamp), // Use earliest timestamp
				};
				continue;
			}
		}

		// If we can't merge, add as new part
		mergedParts.push(part);
	}

	return mergedParts;
}

// Extended UIMessage type with our metadata
interface UIMessageWithMetadata extends UIMessage {
	metadata?: {
		id?: string;
		[key: string]: unknown;
	};
}

interface ChatMessagesProps {
	dbMessages: Doc<"messages">[] | null | undefined;
	vercelMessages: UIMessage[];
	emptyState?: {
		icon?: React.ReactNode;
		title?: string;
		description?: string;
	};
}

export function ChatMessages({
	dbMessages,
	vercelMessages,
}: ChatMessagesProps) {
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

	// Find the streaming message from vercelMessages
	let streamingVercelMessage: UIMessageWithMetadata | undefined;
	if (vercelMessages.length > 0) {
		// The last message in vercelMessages should be the streaming one
		const lastVercelMessage = vercelMessages[
			vercelMessages.length - 1
		] as UIMessageWithMetadata;
		// Check if there's a matching database message that's streaming
		const matchingDbMessage = dbMessages.find(
			(msg) =>
				msg._id === lastVercelMessage.metadata?.id &&
				msg.status === "streaming",
		);
		if (matchingDbMessage) {
			streamingVercelMessage = lastVercelMessage;
		}
	}

	return (
		<ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
			<div className="p-2 md:p-4 pb-16">
				<div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
					{dbMessages.map((message) => {
						// For streaming messages, use Vercel data if available
						let displayMessage = message;
						if (
							message.status === "streaming" &&
							streamingVercelMessage &&
							streamingVercelMessage.metadata?.id === message._id
						) {
							// Override with Vercel streaming data
							displayMessage = {
								...message,
								parts: (streamingVercelMessage.parts || []).map((part) => {
									// Convert Vercel AI SDK "source-document" to Convex "source" type
									// @todo iteratively introduce these on client-side.
									if (part.type === "source-document") {
										return {
											...part,
											type: "source" as const,
										};
									}
									return part;
								}) as DbMessagePart[],
							};
						}

						// Process message parts: sort by timestamp and merge consecutive parts of same type
						const processedMessage = {
							...displayMessage,
							parts: processMessageParts(displayMessage.parts || []),
						};

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
