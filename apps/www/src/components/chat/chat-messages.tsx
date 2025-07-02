"use client";

import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import type { UIMessage } from "../../types/schema";
import { MessageDisplay } from "./message-display";
import { MessageLayout } from "./shared/message-layout";
import { ThinkingIndicator } from "./shared/thinking-indicator";

interface ChatMessagesProps {
	messages: UIMessage[];
	databaseMessages?: Doc<"messages">[] | null; // Database messages from Convex
	status?: "ready" | "streaming" | "submitted" | "error";
	emptyState?: {
		icon?: React.ReactNode;
		title?: string;
		description?: string;
	};
}

export function ChatMessages({
	messages,
	databaseMessages,
	status = "ready",
}: ChatMessagesProps) {
	// Debug: Log messages received by ChatMessages
	console.log("[ChatMessages] messages:", messages);
	console.log("[ChatMessages] messages length:", messages.length);
	console.log("[ChatMessages] databaseMessages:", databaseMessages);
	console.log("[ChatMessages] status:", status);

	// Merge database user messages with UI assistant messages
	const mergedMessages = useMemo(() => {
		// If no database messages, just use UI messages
		if (!databaseMessages || databaseMessages.length === 0) {
			return messages;
		}

		// Create a map of database messages by ID for quick lookup
		const dbMessageMap = new Map(databaseMessages.map((msg) => [msg._id, msg]));

		// Filter UI messages to only include assistant messages
		const assistantMessages = messages.filter(
			(msg) => msg.role === "assistant",
		);

		console.log("[ChatMessages] assistantMessages:", assistantMessages);

		// Convert database user messages to UIMessage format
		// @todo make convert function.
		const userMessages: UIMessage[] = databaseMessages
			.filter((msg) => msg.role === "user")
			.map((msg) => ({
				id: msg._id,
				role: "user",
				parts: msg.parts as UIMessage["parts"], // Include parts for compatibility
				createdAt: new Date(msg._creationTime), // Use createdAt, fallback to _creationTime
			}));

		// Combine and sort by timestamp
		const combined = [...userMessages, ...assistantMessages].sort((a, b) => {
			const timeA = a.metadata?.createdAt?.getTime() || 0;
			const timeB = b.metadata?.createdAt?.getTime() || 0;
			return timeA - timeB;
		});

		console.log("[ChatMessages] mergedMessages:", combined);
		console.log("[ChatMessages] userMessages from DB:", userMessages.length);
		console.log(
			"[ChatMessages] assistantMessages from UI:",
			assistantMessages.length,
		);
		return combined;
	}, [messages, databaseMessages]);

	console.log("[ChatMessages] mergedMessages:", mergedMessages);

	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const [isNearBottom, setIsNearBottom] = useState(true);
	const [isUserScrolling, setIsUserScrolling] = useState(false);
	const lastMessageCountRef = useRef(mergedMessages.length);
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
		if (!mergedMessages.length) return;

		const hasNewMessage = mergedMessages.length > lastMessageCountRef.current;
		lastMessageCountRef.current = mergedMessages.length;

		// Check if any message is currently streaming
		// For UIMessages, check if there's an assistant message with incomplete parts
		const hasStreamingMessage = mergedMessages.some((msg) => {
			if (msg.role !== "assistant") return false;
			// Check if the message has metadata indicating streaming
			const metadata = msg.metadata as any;
			return metadata?.isStreaming && !metadata?.isComplete;
		});

		// Auto-scroll if:
		// 1. User is NOT actively scrolling
		// 2. User is near bottom
		// 3. There's a new message OR streaming message
		if (
			!isUserScrolling &&
			isNearBottom &&
			(hasNewMessage || hasStreamingMessage)
		) {
			// Use instant scroll for new messages, smooth for streaming updates
			scrollToBottom(!hasNewMessage);
		}

		// If there's a new message and user is scrolling, reset the user scrolling flag
		// This ensures they see their own messages
		if (
			hasNewMessage &&
			mergedMessages[mergedMessages.length - 1]?.role === "user"
		) {
			setIsUserScrolling(false);
			scrollToBottom(false);
		}
	}, [mergedMessages, isNearBottom, isUserScrolling, scrollToBottom]);

	// Scroll to bottom on initial load
	useEffect(() => {
		scrollToBottom(false);
	}, [scrollToBottom]);

	return (
		<ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
			<div className="p-2 md:p-4 pb-16">
				<div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
					{mergedMessages?.slice().map((msg, index) => {
						console.log(`[ChatMessages] Rendering message ${index}:`, msg);

						// Find the index of the last assistant message
						const lastAssistantIndex =
							mergedMessages
								.map((m, i) => ({ role: m.role, index: i }))
								.filter((m) => m.role === "assistant")
								.pop()?.index ?? -1;

						const isLastAssistantMessage =
							msg.role === "assistant" && index === lastAssistantIndex;

						return (
							<MessageDisplay
								key={msg.id}
								message={msg}
								status={status}
								isLastAssistantMessage={isLastAssistantMessage}
							/>
						);
					})}

					{/* Show thinking indicator when status is "submitted" */}
					{status === "submitted" && (
						<MessageLayout
							avatar={null}
							content={<ThinkingIndicator />}
							messageType="assistant"
						/>
					)}
				</div>
			</div>

			{/* Scroll to bottom button when user has scrolled up */}
			{!isNearBottom && mergedMessages.length > 0 && (
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
