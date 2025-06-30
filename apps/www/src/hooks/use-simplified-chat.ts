"use client";

import type { ModelId } from "@/lib/ai";
import { useCallback } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { useMessages } from "./use-messages";
import { useStreamingTransport } from "./use-streaming-transport";

interface UseSimplifiedChatOptions {
	threadId?: Id<"threads"> | null;
	clientId?: string | null;
	modelId?: ModelId;
	webSearchEnabled?: boolean;
}

/**
 * Combined hook that provides a complete chat experience with simplified architecture
 *
 * This hook demonstrates the new approach:
 * - useMessages: Handles all message state through Convex (single source of truth)
 * - useStreamingTransport: Handles streaming transport only (no state management)
 * - Clean separation of concerns with minimal complexity
 */
export function useSimplifiedChat(options: UseSimplifiedChatOptions = {}) {
	const {
		threadId,
		clientId,
		modelId = "gpt-4o-mini",
		webSearchEnabled = false,
	} = options;

	// Message state management (Convex-only)
	const {
		messages,
		thread,
		hasStreamingMessage,
		sendMessage: convexSendMessage,
		...messageState
	} = useMessages({
		threadId,
		clientId,
		modelId,
		webSearchEnabled,
	});

	// Streaming transport for triggering AI responses
	const {
		streamMessage,
		isStreaming: transportStreaming,
		error: streamingError,
		stop,
	} = useStreamingTransport();

	// Send message function that handles both new and existing chats
	const sendMessage = useCallback(
		async ({
			text,
			attachments,
			modelId: messageModelId,
		}: {
			text: string;
			attachments?: Id<"files">[];
			modelId?: ModelId;
		}) => {
			if (!text.trim()) return;

			try {
				if (threadId) {
					// Existing thread - use HTTP streaming transport
					await streamMessage({
						threadId,
						clientId,
						text,
						options: {
							modelId: messageModelId || modelId,
							webSearchEnabled,
							attachments,
						},
					});
				} else if (clientId) {
					// New thread - use Convex mutation to create thread and send message
					// This will create the thread and send the message, then subsequent messages can use HTTP streaming
					await convexSendMessage({
						text,
						attachments,
						modelId: messageModelId,
					});
				} else {
					throw new Error("Either threadId or clientId must be provided");
				}
			} catch (error) {
				console.error("Failed to send message:", error);
				throw error;
			}
		},
		[threadId, clientId, modelId, webSearchEnabled, streamMessage, convexSendMessage],
	);

	return {
		// Message state (from Convex real-time subscriptions)
		messages,
		thread,
		hasStreamingMessage,
		...messageState,

		// Streaming state (combined from Convex and transport)
		isStreaming: hasStreamingMessage || transportStreaming,
		streamingError,

		// Actions
		sendMessage,
		stop,

		// Computed state
		canSendMessage: !hasStreamingMessage && !transportStreaming,
		totalMessages: messages.length,
	};
}

/**
 * Type exports for components using this hook
 */
export type SimplifiedChatHook = ReturnType<typeof useSimplifiedChat>;
