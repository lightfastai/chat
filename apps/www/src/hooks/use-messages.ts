"use client";

import type { ModelId } from "@/lib/ai";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

interface UseMessagesOptions {
	threadId?: Id<"threads"> | null;
	clientId?: string | null;
	modelId?: ModelId;
	webSearchEnabled?: boolean;
}

export interface MessageWithStatus {
	message: Doc<"messages">;
	isStreaming: boolean;
	isError: boolean;
	isReady: boolean;
}

/**
 * Simplified message management hook using Convex as single source of truth
 * 
 * Benefits:
 * - No complex synchronization between different state sources
 * - Real-time updates through Convex subscriptions
 * - Built-in optimistic updates
 * - Simpler debugging and state management
 */
export function useMessages(options: UseMessagesOptions = {}) {
	const { threadId, clientId, modelId = "gpt-4o-mini", webSearchEnabled = false } = options;

	// Single source of truth: Convex real-time queries
	const messagesByThreadId = useQuery(
		api.messages.list,
		threadId ? { threadId } : "skip"
	);

	const messagesByClientId = useQuery(
		api.messages.listByClientId,
		clientId && !threadId ? { clientId } : "skip"
	);

	// Use threadId messages if available, otherwise clientId messages
	const rawMessages = messagesByThreadId || messagesByClientId || [];

	// Enhanced messages with computed status flags
	const messages = useMemo((): MessageWithStatus[] => {
		return rawMessages.map((message) => ({
			message,
			isStreaming: message.status === "streaming",
			isError: message.status === "error",
			isReady: message.status === "ready",
		}));
	}, [rawMessages]);

	// Check if any message is currently streaming
	const hasStreamingMessage = useMemo(() => {
		return messages.some(m => m.isStreaming);
	}, [messages]);

	// Get the current thread from messages if available
	const currentThread = useQuery(
		api.threads.get,
		threadId ? { threadId } : "skip"
	);

	const threadByClientId = useQuery(
		api.threads.getByClientId,
		clientId && !threadId ? { clientId } : "skip"
	);

	const thread = currentThread || threadByClientId;

	// Mutations with optimistic updates
	const sendMessageMutation = useMutation(api.messages.send);
	const createThreadAndSendMutation = useMutation(api.messages.createThreadAndSend);

	// Send message handler with built-in optimistic updates
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

		const finalModelId = messageModelId || modelId;

		try {
			if (threadId) {
				// Existing thread - use regular send mutation
				return await sendMessageMutation({
					threadId,
					body: text,
					modelId: finalModelId,
					attachments,
					webSearchEnabled,
				});
			} else if (clientId) {
				// New thread - use createThreadAndSend mutation
				return await createThreadAndSendMutation({
					title: "", // Will be generated automatically
					clientId,
					body: text,
					modelId: finalModelId,
					attachments,
					webSearchEnabled,
				});
			} else {
				throw new Error("Either threadId or clientId must be provided");
			}
		} catch (error) {
			console.error("Failed to send message:", error);
			throw error;
		}
	}, [
		threadId,
		clientId,
		modelId,
		webSearchEnabled,
		sendMessageMutation,
		createThreadAndSendMutation,
	]);

	// Add optimistic updates to the sendMessage mutation
	const optimisticSendMessage = useMutation(api.messages.send).withOptimisticUpdate(
		(localStore, args) => {
			if (!threadId) return; // Skip optimistic update for new threads

			// Get current messages
			const existingMessages = localStore.getQuery(api.messages.list, { threadId });
			if (!existingMessages) return;

			// Create optimistic user message
			const optimisticUserMessage: Doc<"messages"> = {
				_id: `temp_user_${Date.now()}` as Id<"messages">,
				_creationTime: Date.now(),
				threadId,
				parts: [{ type: "text", text: args.body }],
				timestamp: Date.now(),
				messageType: "user",
				model: "anthropic", // Placeholder
				modelId: args.modelId || "gpt-4o-mini",
				attachments: args.attachments,
				status: "ready",
				usage: {
					inputTokens: 0,
					outputTokens: 0,
					totalTokens: 0,
					reasoningTokens: 0,
					cachedInputTokens: 0,
				},
			};

			// Create optimistic assistant message (streaming placeholder)
			const optimisticAssistantMessage: Doc<"messages"> = {
				_id: `temp_assistant_${Date.now()}` as Id<"messages">,
				_creationTime: Date.now() + 1,
				threadId,
				parts: [],
				timestamp: Date.now() + 1,
				messageType: "assistant",
				model: "anthropic", // Placeholder
				modelId: args.modelId || "gpt-4o-mini",
				status: "submitted",
				usage: {
					inputTokens: 0,
					outputTokens: 0,
					totalTokens: 0,
					reasoningTokens: 0,
					cachedInputTokens: 0,
				},
			};

			// Update local store with optimistic messages
			localStore.setQuery(
				api.messages.list,
				{ threadId },
				[...existingMessages, optimisticUserMessage, optimisticAssistantMessage]
			);
		}
	);

	// Use optimistic mutation for existing threads, regular for new threads
	const handleSendMessage = useCallback(async (params: {
		text: string;
		attachments?: Id<"files">[];
		modelId?: ModelId;
	}) => {
		if (threadId) {
			// Use optimistic update for existing threads
			return await optimisticSendMessage({
				threadId,
				body: params.text,
				modelId: params.modelId || modelId,
				attachments: params.attachments,
				webSearchEnabled,
			});
		} else {
			// Use regular mutation for new threads
			return await sendMessage(params);
		}
	}, [threadId, modelId, webSearchEnabled, optimisticSendMessage, sendMessage]);

	return {
		// Message state
		messages,
		rawMessages,
		hasStreamingMessage,
		
		// Thread state
		thread,
		threadId: thread?._id || null,
		isGenerating: thread?.isGenerating || false,
		
		// Actions
		sendMessage: handleSendMessage,
		
		// Computed state
		isEmpty: messages.length === 0,
		lastMessage: messages[messages.length - 1] || null,
		userMessageCount: messages.filter(m => m.message.messageType === "user").length,
		assistantMessageCount: messages.filter(m => m.message.messageType === "assistant").length,
	};
}

// Helper to extract text content from message parts
export function getMessageText(message: Doc<"messages">): string {
	if (!message.parts) return "";
	
	return message.parts
		.filter(part => part.type === "text")
		.map(part => (part as { text: string }).text)
		.join("");
}

// Helper to check if message has specific part types
export function hasPartType(message: Doc<"messages">, partType: string): boolean {
	return message.parts?.some(part => part.type === partType) || false;
}