"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export interface CreateThreadArgs {
	clientId: string;
	title?: string;
}

/**
 * Hook for creating threads with optimistic updates
 * Makes thread creation feel instant in the UI
 */
export function useOptimisticThreadCreate() {
	// Get the current user to use in optimistic updates
	const currentUser = useQuery(api.users.current);

	return useMutation(api.threads.createOptimistic).withOptimisticUpdate(
		(localStore, args: CreateThreadArgs) => {
			const { clientId, title } = args;

			// Get current threads list
			const existingThreads = localStore.getQuery(api.threads.list, {});
			if (existingThreads === undefined) return;

			// If we don't have a user ID yet, we can't create an optimistic thread
			// This shouldn't happen in practice as the user should be authenticated
			if (!currentUser?._id) return;

			// Create optimistic thread
			const now = Date.now();
			const optimisticThread = {
				_id: `temp_${clientId}` as Id<"threads">,
				_creationTime: now,
				clientId,
				title: title || "New chat",
				userId: currentUser._id,
				createdAt: now,
				lastMessageAt: now,
				isTitleGenerating: true,
				isGenerating: false,
				pinned: false,
				branchedFrom: undefined,
				isPublic: false,
				shareId: undefined,
				sharedAt: undefined,
				shareSettings: {
					showThinking: false,
				},
				usage: {
					totalInputTokens: 0,
					totalOutputTokens: 0,
					totalTokens: 0,
					totalReasoningTokens: 0,
					totalCachedInputTokens: 0,
					messageCount: 0,
					modelStats: {},
				},
			};

			// Update local store - add to beginning of list
			localStore.setQuery(api.threads.list, {}, [
				optimisticThread,
				...existingThreads,
			]);

			// Also set it for getByClientId query
			localStore.setQuery(
				api.threads.getByClientId,
				{ clientId },
				optimisticThread,
			);
		},
	);
}
