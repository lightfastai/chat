"use client";

import { nanoid } from "@/lib/nanoid";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export interface CreateThreadWithMessagesArgs {
	clientId: string;
	title?: string;
	userMessage?: string;
	modelId?: string;
	// Internal use - pre-generated IDs for optimistic updates
	optimisticUserMessageId?: Id<"messages">;
	optimisticAssistantMessageId?: Id<"messages">;
}

export interface CreateThreadWithMessagesResult {
	threadId: Id<"threads">;
	userMessageId?: Id<"messages">;
	assistantMessageId?: Id<"messages">;
}

/**
 * Hook for creating threads with optimistic updates including messages
 * Makes thread and message creation feel instant in the UI
 */
export function useOptimisticThreadCreate() {
	// Get the current user to use in optimistic updates
	const currentUser = useQuery(api.users.current);

	const mutation = useMutation(
		api.threads.createOptimistic,
	).withOptimisticUpdate((localStore, args: CreateThreadWithMessagesArgs) => {
		const {
			clientId,
			title,
			userMessage,
			modelId,
			optimisticUserMessageId,
			optimisticAssistantMessageId,
		} = args;

		// Get current threads list
		const existingThreads = localStore.getQuery(api.threads.list, {});
		if (existingThreads === undefined) return;

		// If we don't have a user ID yet, we can't create an optimistic thread
		// This shouldn't happen in practice as the user should be authenticated
		if (!currentUser?._id) return;

		// Create optimistic thread
		const now = Date.now();
		const optimisticThreadId = `temp_${clientId}` as Id<"threads">;
		const optimisticThread = {
			_id: optimisticThreadId,
			_creationTime: now,
			clientId,
			title: title || "New chat",
			userId: currentUser._id,
			createdAt: now,
			lastMessageAt: now,
			isTitleGenerating: true,
			isGenerating: userMessage ? true : false, // Set to true if we're about to send a message
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
				messageCount: userMessage ? 1 : 0, // Count user message if provided
				modelStats: {},
			},
		};

		// Create optimistic messages if userMessage is provided
		const optimisticMessages = [];

		if (
			userMessage &&
			optimisticUserMessageId &&
			optimisticAssistantMessageId
		) {
			// Create optimistic user message with pre-generated ID
			const optimisticUserMessage = {
				_id: optimisticUserMessageId,
				_creationTime: now,
				threadId: optimisticThreadId,
				timestamp: now,
				messageType: "user" as const,
				modelId: (modelId as any) || "gpt-4o-mini",
				parts: [
					{
						type: "text" as const,
						text: userMessage,
					},
				],
				status: "ready" as const,
				usage: {
					inputTokens: 0,
					outputTokens: 0,
					totalTokens: 0,
					reasoningTokens: 0,
					cachedInputTokens: 0,
				},
			};
			optimisticMessages.push(optimisticUserMessage);

			// Create optimistic assistant message (empty, in submitted state) with pre-generated ID
			const optimisticAssistantMessage = {
				_id: optimisticAssistantMessageId,
				_creationTime: now + 1, // Slightly later timestamp
				threadId: optimisticThreadId,
				timestamp: now + 1,
				messageType: "assistant" as const,
				modelId: (modelId as any) || "gpt-4o-mini",
				parts: [], // Empty parts initially
				status: "submitted" as const, // Will be updated when real response comes
				usage: {
					inputTokens: 0,
					outputTokens: 0,
					totalTokens: 0,
					reasoningTokens: 0,
					cachedInputTokens: 0,
				},
			};
			optimisticMessages.push(optimisticAssistantMessage);

			// Update messages queries
			const existingMessages = localStore.getQuery(
				api.messages.listByClientId,
				{ clientId },
			);
			if (existingMessages !== undefined) {
				localStore.setQuery(api.messages.listByClientId, { clientId }, [
					...optimisticMessages,
					...existingMessages,
				]);
			} else {
				// Set messages for new chat
				localStore.setQuery(
					api.messages.listByClientId,
					{ clientId },
					optimisticMessages,
				);
			}

			// Also set by threadId query if it exists
			const existingMessagesByThread = localStore.getQuery(api.messages.list, {
				threadId: optimisticThreadId,
			});
			if (existingMessagesByThread !== undefined) {
				localStore.setQuery(
					api.messages.list,
					{ threadId: optimisticThreadId },
					[...optimisticMessages, ...existingMessagesByThread],
				);
			} else {
				localStore.setQuery(
					api.messages.list,
					{ threadId: optimisticThreadId },
					optimisticMessages,
				);
			}
		}

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

		// Return the IDs for use in the component
		return {
			threadId: optimisticThreadId,
			userMessageId: optimisticUserMessageId,
			assistantMessageId: optimisticAssistantMessageId,
		};
	});

	// Return a wrapped function that provides the enhanced interface
	return async (
		args: CreateThreadWithMessagesArgs,
	): Promise<CreateThreadWithMessagesResult> => {
		// Pre-generate IDs that will be used in optimistic update
		const optimisticUserMessageId = args.userMessage
			? (`temp_user_${nanoid()}` as Id<"messages">)
			: undefined;
		const optimisticAssistantMessageId = args.userMessage
			? (`temp_assistant_${nanoid()}` as Id<"messages">)
			: undefined;

		// Create enhanced args with pre-generated IDs for optimistic update
		const enhancedArgs = {
			...args,
			optimisticUserMessageId,
			optimisticAssistantMessageId,
		};

		// Call the original mutation with enhanced args that include the pre-generated IDs
		const threadId = await mutation(enhancedArgs);

		// Return the structure that includes the pre-generated message IDs
		return {
			threadId,
			userMessageId: optimisticUserMessageId,
			assistantMessageId: optimisticAssistantMessageId,
		};
	};
}
