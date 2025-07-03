"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

/**
 * Hook for creating threads with optimistic updates
 * Makes thread creation feel instant in the UI
 */
export function useCreateThreadWithFirstMessages() {
	// Get the current user to use in optimistic updates
	const currentUser = useQuery(api.users.current);

	return useMutation(
		api.threads.createThreadWithFirstMessages,
	).withOptimisticUpdate((localStore, args) => {
		const { clientThreadId, message, modelId } = args;

		// If we don't have a user ID yet, we can't create an optimistic thread
		// This shouldn't happen in practice as the user should be authenticated
		if (!currentUser?._id) {
			console.error("No user ID found");
			return;
		}

		// Create optimistic thread with a temporary ID that looks like a real thread ID,
		// Convex automatically generates a real ID for the thread when it's created
		// and updates the local store with the real ID
		const optimisticThreadId = crypto.randomUUID() as Id<"threads">;

		// Create optimistic thread
		const now = Date.now();
		const optimisticThread: Doc<"threads"> = {
			_id: optimisticThreadId,
			_creationTime: now,
			clientId: clientThreadId,
			title: "",
			userId: currentUser._id,
			createdAt: now,
			isTitleGenerating: true,
			pinned: false,
			branchedFrom: undefined,
			isPublic: false,
			shareId: undefined,
			sharedAt: undefined,
			shareSettings: {
				showThinking: false,
			},
			metadata: {
				usage: {
					totalInputTokens: 0,
					totalOutputTokens: 0,
					totalTokens: 0,
					totalReasoningTokens: 0,
					totalCachedInputTokens: 0,
					messageCount: 0,
				},
			},
		};

		// Get current threads list
		const existingThreads = localStore.getQuery(api.threads.list, {}) || [];

		// Update local store - add to beginning of list
		localStore.setQuery(api.threads.list, {}, [
			optimisticThread,
			...existingThreads,
		]);

		// Also set it for getByClientId query
		localStore.setQuery(
			api.threads.getByClientId,
			{ clientId: clientThreadId },
			optimisticThread as Doc<"threads">,
		);

		// Create optimistic user message
		const optimisticUserMessage: Doc<"messages"> = {
			_id: crypto.randomUUID() as Id<"messages">,
			_creationTime: now,
			threadId: optimisticThreadId,
			parts: [message],
			role: "user",
			modelId,
			timestamp: now,
			status: "ready",
		};

		// Create optimistic assistant message placeholder
		const optimisticAssistantMessage: Doc<"messages"> = {
			_id: crypto.randomUUID() as Id<"messages">,
			_creationTime: now + 1, // Slightly after user message
			threadId: optimisticThreadId,
			parts: [], // Empty parts, will be filled during streaming
			role: "assistant",
			modelId,
			model: modelId.split("/")[0] as any, // Extract provider from modelId
			timestamp: now + 1,
			status: "submitted", // Shows thinking indicator
		};

		const existingMessages =
			localStore.getQuery(api.messages.listByClientId, {
				clientId: clientThreadId,
			}) || [];

		// Update local store - add both messages to end of list (newest last)
		// This matches the order returned by the server query
		localStore.setQuery(
			api.messages.listByClientId,
			{ clientId: clientThreadId },
			[...existingMessages, optimisticUserMessage, optimisticAssistantMessage],
		);

		return {
			threadId: optimisticThreadId,
			userMessageId: optimisticUserMessage._id,
			assistantMessageId: optimisticAssistantMessage._id,
		};
	});
}
