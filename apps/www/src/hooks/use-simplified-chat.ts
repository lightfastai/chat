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

	// Streaming transport (Vercel AI SDK for HTTP streaming only)
	const {
		streamMessage,
		isStreaming: transportStreaming,
		error: streamingError,
		stop,
	} = useStreamingTransport();

	// Unified send message function that combines optimistic updates with streaming
	const sendMessage = useCallback(async ({
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
			// Option 1: Use optimistic Convex mutation (for existing threads)
			// This provides instant UI feedback while streaming happens in background
			if (threadId) {
				await convexSendMessage({
					text,
					attachments,
					modelId: messageModelId,
				});
				
				// Streaming will update the assistant message in real-time through Convex subscriptions
				// No complex synchronization needed!
				return;
			}

			// Option 2: For new threads, use the streaming transport
			// This will create the thread and trigger streaming in one go
			await streamMessage({
				text,
				options: {
					modelId: messageModelId || modelId,
					webSearchEnabled,
					attachments,
				},
			});
		} catch (error) {
			console.error("Failed to send message:", error);
			throw error;
		}
	}, [
		threadId,
		clientId,
		modelId,
		webSearchEnabled,
		convexSendMessage,
		streamMessage,
	]);

	return {
		// Message state (from Convex real-time subscriptions)
		messages,
		thread,
		hasStreamingMessage,
		...messageState,

		// Streaming state (from transport)
		isStreaming: transportStreaming,
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