"use client";

import type { UIMessage } from "@ai-sdk/react";
import { Markdown } from "@lightfast/ui/components/ui/markdown";
import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
import { cn } from "@lightfast/ui/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

interface UIMessagesDisplayProps {
	messages: UIMessage[];
	isLoading?: boolean;
}

export function UIMessagesDisplay({
	messages,
	isLoading = false,
}: UIMessagesDisplayProps) {
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const [isNearBottom, setIsNearBottom] = useState(true);
	const [isUserScrolling, setIsUserScrolling] = useState(false);
	const lastMessageCountRef = useRef(messages.length);
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastScrollPositionRef = useRef(0);

	// Check if user is near bottom of scroll area
	const checkIfNearBottom = useCallback(() => {
		if (!viewportRef.current) return true;

		const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
		const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
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
			const viewport = scrollAreaRef.current.querySelector(
				'[data-slot="scroll-area-viewport"]',
			);
			if (viewport instanceof HTMLDivElement) {
				viewportRef.current = viewport;

				const handleScroll = () => {
					const currentScrollTop = viewport.scrollTop;
					const scrollDelta = currentScrollTop - lastScrollPositionRef.current;

					if (scrollDelta < -5) {
						setIsUserScrolling(true);

						if (scrollTimeoutRef.current) {
							clearTimeout(scrollTimeoutRef.current);
						}

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
		if (!messages.length) return;

		const hasNewMessage = messages.length > lastMessageCountRef.current;
		lastMessageCountRef.current = messages.length;

		// Check if any message is currently streaming
		const hasStreamingMessage = messages.some((msg) => {
			// Check if the last part is still being added to
			const lastPart = msg.parts?.[msg.parts.length - 1];
			return (
				lastPart?.type === "text" &&
				!msg.parts?.some((p) => p.type === "tool-call")
			);
		});

		if (
			!isUserScrolling &&
			isNearBottom &&
			(hasNewMessage || hasStreamingMessage)
		) {
			scrollToBottom(!hasNewMessage);
		}

		// If there's a new user message, reset scrolling
		if (hasNewMessage && messages[messages.length - 1]?.role === "user") {
			setIsUserScrolling(false);
			scrollToBottom(false);
		}
	}, [messages, isNearBottom, isUserScrolling, scrollToBottom]);

	// Scroll to bottom on initial load
	useEffect(() => {
		scrollToBottom(false);
	}, [scrollToBottom]);

	// Helper to render message content
	const renderMessageContent = (message: UIMessage) => {
		if (!message.parts || message.parts.length === 0) {
			return null;
		}

		return message.parts.map((part, partIdx) => {
			if (part.type === "text") {
				return (
					<div
						key={`${message.id}-part-${partIdx}`}
						className="prose prose-sm dark:prose-invert max-w-none"
					>
						<Markdown>{(part as { text: string }).text}</Markdown>
					</div>
				);
			}
			if (part.type.startsWith("tool-")) {
				const toolName = part.type.substring(5); // Extract tool name from "tool-{name}"
				return (
					<div
						key={`${message.id}-part-${partIdx}`}
						className="text-xs text-muted-foreground"
					>
						Tool: {toolName}
					</div>
				);
			}
			if (part.type === "reasoning") {
				return (
					<div
						key={`${message.id}-part-${partIdx}`}
						className="text-sm text-muted-foreground italic"
					>
						Thinking: {(part as { text: string }).text}
					</div>
				);
			}
			return null;
		});
	};

	return (
		<ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
			<div className="p-2 md:p-4 pb-16">
				<div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
					{messages.map((msg, idx) => (
						<div
							key={msg.id || idx}
							className={cn(
								"flex gap-3 p-4 rounded-lg",
								msg.role === "user"
									? "bg-muted/50 ml-auto max-w-[80%]"
									: "bg-background border",
							)}
						>
							<div className="flex-1 space-y-2">
								<div className="text-xs font-medium text-muted-foreground">
									{msg.role === "user" ? "You" : "Assistant"}
								</div>
								{renderMessageContent(msg)}
							</div>
						</div>
					))}

					{isLoading && (
						<div className="text-center text-muted-foreground py-4">
							<div className="animate-pulse">Generating response...</div>
						</div>
					)}
				</div>
			</div>

			{/* Scroll to bottom button */}
			{!isNearBottom && messages.length > 0 && (
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
