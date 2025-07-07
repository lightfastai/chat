"use client";

import { Button } from "@lightfast/ui/components/ui/button";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
	const [isStreaming, setIsStreaming] = useState(false);

	// Use the hook approach of use-stick-to-bottom
	const { scrollRef, contentRef, isAtBottom, scrollToBottom, state } =
		useStickToBottom({
			resize: "smooth",
			initial: "instant",
		});

	// Create a callback ref that properly calls the library's ref callback
	const viewportRef = useCallback(
		(node: HTMLDivElement | null) => {
			// The scrollRef from useStickToBottom is a callback ref function
			// that sets up event listeners when called with the scroll element
			scrollRef(node);
		},
		[scrollRef],
	);

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
				<ScrollAreaPrimitive.Root
					data-slot="scroll-area"
					className="relative h-full"
				>
					<ScrollAreaPrimitive.Viewport
						ref={viewportRef}
						data-slot="scroll-area-viewport"
						className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
					>
						<div ref={contentRef} className="p-2 md:p-4 pb-24">
							<div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
								{/* Empty state */}
							</div>
						</div>
					</ScrollAreaPrimitive.Viewport>
					<ScrollAreaPrimitive.Scrollbar
						data-slot="scroll-area-scrollbar"
						orientation="vertical"
						className="flex touch-none p-px transition-colors select-none h-full w-2.5 border-l border-l-transparent"
					>
						<ScrollAreaPrimitive.Thumb
							data-slot="scroll-area-thumb"
							className="bg-border relative flex-1 rounded-full"
						/>
					</ScrollAreaPrimitive.Scrollbar>
					<ScrollAreaPrimitive.Corner />
				</ScrollAreaPrimitive.Root>
				{!isAtBottom && (
					<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
						<Button
							type="button"
							onClick={() => scrollToBottom()}
							variant="secondary"
							size="sm"
							className="shadow-lg hover:shadow-xl transition-all duration-200"
							aria-label="Scroll to bottom"
						>
							<ChevronDown className="h-4 w-4" />
						</Button>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="relative flex-1 min-h-0">
			<ScrollAreaPrimitive.Root
				data-slot="scroll-area"
				className="relative h-full"
			>
				<ScrollAreaPrimitive.Viewport
					ref={viewportRef}
					data-slot="scroll-area-viewport"
					className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
				>
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
									<MessageDisplay
										key={message._id}
										message={processedMessage}
									/>
								);
							})}
						</div>
					</div>
				</ScrollAreaPrimitive.Viewport>
				<ScrollAreaPrimitive.Scrollbar
					data-slot="scroll-area-scrollbar"
					orientation="vertical"
					className="flex touch-none p-px transition-colors select-none h-full w-2.5 border-l border-l-transparent"
				>
					<ScrollAreaPrimitive.Thumb
						data-slot="scroll-area-thumb"
						className="bg-border relative flex-1 rounded-full"
					/>
				</ScrollAreaPrimitive.Scrollbar>
				<ScrollAreaPrimitive.Corner />
			</ScrollAreaPrimitive.Root>

			{/* Scroll to bottom button - positioned above chat input */}
			{!isAtBottom && dbMessages.length > 0 && (
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
					<Button
						type="button"
						onClick={() => scrollToBottom()}
						variant={isStreaming && state?.escapedFromLock ? "default" : "secondary"}
						size="sm"
						className={`shadow-lg hover:shadow-xl transition-all duration-200 ${
							isStreaming && state?.escapedFromLock
								? "bg-orange-500 hover:bg-orange-600 text-white animate-pulse"
								: ""
						}`}
						aria-label={
							isStreaming && state?.escapedFromLock
								? "Resume auto-scroll"
								: "Scroll to bottom"
						}
					>
						<ChevronDown className="h-4 w-4" />
						{isStreaming && state?.escapedFromLock && (
							<span className="ml-1">Resume</span>
						)}
					</Button>
				</div>
			)}
		</div>
	);
}
