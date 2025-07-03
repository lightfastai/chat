"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

/**
 * Hook for creating messages in existing threads with optimistic updates
 * Makes message creation feel instant in the UI
 */
export function useOptimisticMessageCreate() {
	// Get the current user to use in optimistic updates
	const currentUser = useQuery(api.users.current);

	return useMutation(api.messages.createSubsequentMessages).withOptimisticUpdate(
		(localStore, args) => {
			const { threadId, message, modelId } = args;

			// If we don't have a user ID yet, we can't create optimistic messages
			if (!currentUser?._id) {
				console.error("No user ID found");
				return;
			}

			// Get the thread to access its clientId
			// First try to get thread by ID
			let thread = localStore.getQuery(api.threads.get, { threadId });

			// If not found, we need to find it from the threads list
			if (!thread) {
				const threadsList = localStore.getQuery(api.threads.list, {}) || [];
				thread = threadsList.find((t) => t._id === threadId);
			}

			if (!thread?.clientId) {
				console.error("Thread or clientId not found", { threadId });
				return;
			}

			const now = Date.now();

			// Create optimistic user message
			const optimisticUserMessage: Doc<"messages"> = {
				_id: crypto.randomUUID() as Id<"messages">,
				_creationTime: now,
				threadId,
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
				threadId,
				parts: [], // Empty parts, will be filled during streaming
				role: "assistant",
				modelId,
				model: modelId.split("/")[0] as "openai" | "anthropic" | "openrouter", // Extract provider from modelId
				timestamp: now + 1,
				status: "submitted", // Shows thinking indicator
			};

			// Get existing messages for this thread using clientId
			const existingMessages =
				localStore.getQuery(api.messages.listByClientId, {
					clientId: thread.clientId,
				}) || [];

			// Update local store - add both messages to end of list (newest last)
			// This matches the order returned by the server query
			localStore.setQuery(
				api.messages.listByClientId,
				{ clientId: thread.clientId },
				[
					...existingMessages,
					optimisticUserMessage,
					optimisticAssistantMessage,
				],
			);

			// Update the thread in local store to show it's generating
			// We already have the thread from above, so just use it
			const currentThread = thread;

			if (currentThread) {
				// Update the thread to show it's generating
				localStore.setQuery(
					api.threads.get,
					{ threadId },
					{
						...currentThread,
						isGenerating: true,
						lastMessageAt: now,
					},
				);

				// Also update in the threads list
				const threadsList = localStore.getQuery(api.threads.list, {}) || [];
				const updatedThreadsList = threadsList.map((t) =>
					t._id === threadId
						? { ...t, isGenerating: true, lastMessageAt: now }
						: t,
				);
				localStore.setQuery(api.threads.list, {}, updatedThreadsList);
			}

			return {
				userMessageId: optimisticUserMessage._id,
				assistantMessageId: optimisticAssistantMessage._id,
			};
		},
	);
}
