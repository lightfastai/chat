"use client";

import { nanoid } from "@/lib/nanoid";
import { useChat as useVercelChat } from "@ai-sdk/react";
import { useAuthToken } from "@convex-dev/auth/react";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery, useQuery } from "convex/react";
import { useCallback, useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ModelId } from "../lib/ai/schemas";
import type { UIMessage } from "../types/schema";
import { useChatTransport } from "./use-chat-transport";
import { useCreateSubsequentMessages } from "./use-create-subsequent-messages";
import { useCreateThreadWithFirstMessages } from "./use-create-thread-with-first-messages";

interface UseChatProps {
	initialMessages: UIMessage[];
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
	clientId: string | null;
}

/**
 * Core chat hook that manages all chat state and interactions
 * Uses Vercel AI SDK with custom Convex transport for streaming
 */
export function useChat({
	initialMessages,
	preloadedUserSettings,
	clientId,
}: UseChatProps) {
	const authToken = useAuthToken();
	const createThreadOptimistic = useCreateThreadWithFirstMessages();
	const createMessageOptimistic = useCreateSubsequentMessages();

	// Track if user has ever sent a message
	const hasEverSentMessage = useRef(false);

	// Reset when we're in a truly new chat
	useEffect(() => {
		if (clientId === "new" && initialMessages.length === 0) {
			hasEverSentMessage.current = false;
		} else if (initialMessages.length > 0) {
			hasEverSentMessage.current = true;
		}
	}, [clientId, initialMessages.length]);

	// Query thread if we have a clientId
	const thread = useQuery(
		api.threads.getByClientId,
		clientId ? { clientId } : "skip",
	);

	// Extract data from preloaded queries if available
	let userSettings = null;

	if (preloadedUserSettings) {
		userSettings = usePreloadedQuery(preloadedUserSettings);
	}

	const defaultModel = userSettings?.preferences?.defaultModel || "gpt-4o-mini";

	// Create transport using the dedicated hook
	const transport = useChatTransport({
		authToken,
		defaultModel,
	});

	// Generate or use existing clientId for the chat session
	const chatId = clientId ?? nanoid();

	// Use Vercel AI SDK with custom transport and preloaded messages
	const {
		messages: uiMessages,
		status,
		sendMessage: vercelSendMessage,
	} = useVercelChat<UIMessage>({
		id: chatId,
		transport,
		generateId: () => nanoid(),
		messages: initialMessages,
		onError: (error) => {
			console.error("Chat error:", error);
		},
	});

	// Computed values
	const isEmpty = uiMessages.length === 0;
	const totalMessages = uiMessages.length;
	const canSendMessage = status !== "streaming" && !!authToken;

	// Adapt sendMessage to use Vercel AI SDK v5 with transport
	const sendMessage = useCallback(
		async (
			message: string,
			selectedModelId: ModelId,
			attachments?: Id<"files">[],
			webSearchEnabledOverride?: boolean,
		) => {
			let userMessageId: string | undefined;
			let assistantMessageId: string | undefined;

			// Check if this is a new thread (no thread exists yet)
			if (!thread?._id) {
				// Update URL using replaceState for seamless navigation
				window.history.replaceState({}, "", `/chat/${chatId}`);
				const data = await createThreadOptimistic({
					clientThreadId: chatId,
					message: { type: "text", text: message },
					modelId: selectedModelId,
				});
				userMessageId = data.userMessageId;
				assistantMessageId = data.assistantMessageId;

				// Mark that we've sent a message
				hasEverSentMessage.current = true;
			} else {
				// Existing thread
				const data = await createMessageOptimistic({
					threadId: thread._id,
					message: { type: "text", text: message },
					modelId: selectedModelId,
				});
				userMessageId = data.userMessageId;
				assistantMessageId = data.assistantMessageId;
			}

			if (!userMessageId || !assistantMessageId) {
				// @todo need to deep test so this never happens or rewrite our logic.
				console.error("User or assistant message ID not found", {
					userMessageId,
					assistantMessageId,
				});
				return;
			}

			await vercelSendMessage(
				{
					role: "user",
					parts: [{ type: "text", text: message }],
					id: userMessageId,
				},
				{
					body: {
						id: assistantMessageId,
						userMessageId,
						threadClientId: chatId,
						options: {
							webSearchEnabled: webSearchEnabledOverride || false,
							attachments,
						},
					},
				},
			);
		},
		[
			vercelSendMessage,
			chatId,
			createThreadOptimistic,
			createMessageOptimistic,
			thread?._id,
		],
	);

	return {
		// Messages
		messages: uiMessages,
		isEmpty,
		totalMessages,

		// Status - direct from Vercel AI SDK
		status,
		canSendMessage,
		isNewChat: clientId === "new",

		// Actions
		sendMessage,

		// User settings
		defaultModel,
	};
}
