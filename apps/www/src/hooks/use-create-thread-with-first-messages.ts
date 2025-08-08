"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { DbMessage, DbThread } from "../../convex/types";

/**
 * Hook for creating threads with optimistic updates
 * Makes thread creation feel instant in the UI
 */
export function useCreateThreadWithFirstMessages() {
	// Get the current user to use in optimistic updates
	const currentUser = useQuery(api.users.current);
	// Get the Clerk user for the clerkUserId field
	const { user: clerkUser } = useUser();

	return useMutation(
		api.threads.createThreadWithFirstMessages,
	).withOptimisticUpdate((localStore, args) => {
		const { clientThreadId, message, modelId } = args;

		// If we don't have a user ID yet, we can't create an optimistic thread
		// This shouldn't happen in practice as the user should be authenticated
		if (!currentUser?._id || !clerkUser?.id) {
			console.error("No user ID found");
			return;
		}

		// Create optimistic thread with a temporary ID that looks like a real thread ID,
		// Convex automatically generates a real ID for the thread when it's created
		// and updates the local store with the real ID
		const optimisticThreadId = crypto.randomUUID() as Id<"threads">;

		// Create optimistic thread
		const now = Date.now();
		const optimisticThread: DbThread = {
			_id: optimisticThreadId,
			_creationTime: now,
			clientId: clientThreadId,
			title: "",
			userId: currentUser._id,
			clerkUserId: clerkUser.id, // Use the actual Clerk user ID
			pinned: undefined, // Match backend behavior - undefined means unpinned
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

		// Update the new queries used by infinite scroll sidebar
		// For paginated queries, we need to check all stored queries since usePaginatedQuery
		// internally adds paginationOpts with varying parameters
		const allPaginatedQueries = localStore.getAllQueries(
			api.threads.listForInfiniteScroll,
		);

		// Find the initial page query (cursor: null)
		let foundInitialPage = false;
		for (const queryData of allPaginatedQueries) {
			const result = queryData.value;
			if (
				queryData.args.paginationOpts?.cursor === null &&
				result &&
				"page" in result
			) {
				// Update this query with the new thread at the beginning
				localStore.setQuery(api.threads.listForInfiniteScroll, queryData.args, {
					...result,
					page: [optimisticThread, ...result.page],
				});
				foundInitialPage = true;
			}
		}

		// If we didn't find any paginated query, we might need to create one
		// This happens when the sidebar hasn't loaded yet or when no queries match
		if (!foundInitialPage && allPaginatedQueries.length === 0) {
			// Since the component uses usePaginatedQuery with {}, it will internally
			// create queries with paginationOpts. We can't predict the exact args,
			// so we'll just update the regular list query for now
			console.log("No paginated queries found for optimistic update");
		}

		// Also update the old list query for backward compatibility (if still used elsewhere)
		const existingThreads = localStore.getQuery(api.threads.list, {}) || [];
		localStore.setQuery(api.threads.list, {}, [
			optimisticThread,
			...existingThreads,
		]);

		// Also set it for getByClientId query
		localStore.setQuery(
			api.threads.getByClientId,
			{ clientId: clientThreadId },
			optimisticThread,
		);

		// Create optimistic user message
		const optimisticUserMessage: DbMessage = {
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
		const optimisticAssistantMessage: DbMessage = {
			_id: crypto.randomUUID() as Id<"messages">,
			_creationTime: now + 1, // Slightly after user message
			threadId: optimisticThreadId,
			parts: [], // Empty parts, will be filled during streaming
			role: "assistant",
			modelId,
			model: modelId.split("/")[0] as "anthropic" | "openai" | "openrouter", // Extract provider from modelId
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
