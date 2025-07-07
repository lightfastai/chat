"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

/**
 * Hook for creating messages in existing threads with optimistic updates
 * Makes message creation feel instant in the UI
 */
export function useCreateSubsequentMessages() {
	// Get the current user to use in optimistic updates
	const currentUser = useQuery(api.users.current);

	return useMutation(
		api.messages.createSubsequentMessages,
	).withOptimisticUpdate((localStore, args) => {
		const { threadId, message, modelId } = args;

		// If we don't have a user ID yet, we can't create optimistic messages
		if (!currentUser?._id) {
			console.error("No user ID found");
			return;
		}

		// Get the thread to access its clientId
		// First try to get thread by ID
		let thread = localStore.getQuery(api.threads.get, { threadId });

		// If not found, we need to find it from the various thread lists
		if (!thread) {
			// Check pinned threads
			const pinnedThreads =
				localStore.getQuery(api.threads.listPinned, {}) || [];
			thread = pinnedThreads.find((t) => t._id === threadId);

			// If still not found, check unpinned threads (paginated)
			if (!thread) {
				// Check the first page of unpinned threads
				const paginatedResult = localStore.getQuery(
					api.threads.listForInfiniteScroll,
					{ paginationOpts: { numItems: 5, cursor: null } },
				);

				if (paginatedResult && "page" in paginatedResult) {
					thread = paginatedResult.page.find((t) => t._id === threadId);
				}
			}

			// Also check the old list query for backward compatibility
			if (!thread) {
				const threadsList = localStore.getQuery(api.threads.list, {}) || [];
				thread = threadsList.find((t) => t._id === threadId);
			}
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
			[...existingMessages, optimisticUserMessage, optimisticAssistantMessage],
		);

		// Since threads are sorted by _creationTime and we can't change that in optimistic updates,
		// we can't reorder the thread to the top. The thread will stay in its current position
		// until the user refreshes or navigates away and back.
		// This is a limitation of the current implementation where threads don't have
		// an updatable lastMessageAt field.

		return {
			userMessageId: optimisticUserMessage._id,
			assistantMessageId: optimisticAssistantMessage._id,
		};
	});
}
