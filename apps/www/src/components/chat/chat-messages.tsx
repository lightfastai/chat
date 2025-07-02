"use client";

import type { UIMessage } from "@ai-sdk/react";
import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
import type { ChatStatus } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { MessageDisplay } from "./message-display";
import { DbMessagePart } from "../../../convex/types";

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
	status?: ChatStatus;
	emptyState?: {
		icon?: React.ReactNode;
		title?: string;
		description?: string;
	};
}

export function ChatMessages({
	dbMessages,
	vercelMessages,
	status = "ready",
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

		// Check if streaming
		const isStreaming = status === "streaming";

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
	}, [dbMessages, status, isNearBottom, isUserScrolling, scrollToBottom]);

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

	// Find the streaming message if we're streaming
	let streamingVercelMessage: UIMessageWithMetadata | undefined;
	if (status === "streaming" && vercelMessages.length > 0) {
		// The last message in vercelMessages should be the streaming one
		streamingVercelMessage = vercelMessages[
			vercelMessages.length - 1
		] as UIMessageWithMetadata;
	}

	return (
		<ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
			<div className="p-2 md:p-4 pb-16">
				<div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
					{dbMessages.map((message, index) => {
						// Check if this is the last assistant message in the entire list
						const remainingMessages = dbMessages.slice(index + 1);
						const hasAssistantAfter = remainingMessages.some(
							(m) => m.role === "assistant",
						);
						const isLastAssistantMessage =
							message.role === "assistant" && !hasAssistantAfter;

						// For the last assistant message when streaming, use Vercel data directly
						let displayMessage = message;
						if (
							isLastAssistantMessage &&
							status === "streaming" &&
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
								status: "streaming" as const,
							};
						}

						return (
							<MessageDisplay
								key={message._id}
								message={displayMessage}
								status={status}
								isLastAssistantMessage={isLastAssistantMessage}
							/>
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
