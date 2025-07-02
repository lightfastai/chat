"use client";

import type { MessagePart } from "@/lib/message-parts";
import { nanoid } from "@/lib/nanoid";
import { useChat as useVercelChat } from "@ai-sdk/react";
import { useAuthToken } from "@convex-dev/auth/react";
import type { UIMessage } from "ai";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { useCallback, useMemo } from "react";
import type { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useChatTransport } from "./use-chat-transport";
import { useOptimisticThreadCreate } from "./use-optimistic-thread-create";
import type { ValidThread } from "../types/schema";

interface UseChatProps {
	/** The chat context - type and clientId */
	threadContext: ValidThread;
	preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>;
	preloadedMessages?: Preloaded<typeof api.messages.listByClientId>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}

/**
 * Core chat hook that manages all chat state and interactions
 * Uses Vercel AI SDK with custom Convex transport for streaming
 */
export function useChat({
	threadContext,
	preloadedThreadByClientId,
	preloadedMessages,
	preloadedUserSettings,
}: UseChatProps) {
	const authToken = useAuthToken();
	const createThreadOptimistic = useOptimisticThreadCreate();

	// Extract data from preloaded queries if available
	let threadByClientId = null;
	let userSettings = null;
	let messages = null;

	if (preloadedThreadByClientId) {
		threadByClientId = usePreloadedQuery(preloadedThreadByClientId);
	}

	if (preloadedUserSettings) {
		userSettings = usePreloadedQuery(preloadedUserSettings);
	}

	if (preloadedMessages) {
		messages = usePreloadedQuery(preloadedMessages);
	}

	// Get the resolved thread ID from the clientId (if thread exists)
	const resolvedThreadId = threadByClientId?._id || null;

	const defaultModel = userSettings?.preferences?.defaultModel || "gpt-4o-mini";

	// Create transport using the dedicated hook
	const transport = useChatTransport({
		authToken,
		resolvedThreadId,
		threadContext,
		defaultModel,
	});

	// Convert preloaded messages to Vercel AI SDK format - only for existing chats
	const initialMessages = useMemo(() => {
		// Only process messages for existing chats to prevent leakage to new chats
		if (threadContext.type === "new" || !messages || messages.length === 0) {
			return undefined;
		}

		// Convert Convex messages to Vercel AI UIMessage format
		const converted = messages.map((msg) => ({
			id: msg._id,
			role:
				msg.messageType === "user" ? ("user" as const) : ("assistant" as const),
			parts: (msg.parts || []).map((part: MessagePart) => {
				// Convert Convex "source" type to Vercel AI SDK "source-document" type
				if (part.type === "source") {
					return {
						...part,
						type: "source-document" as const,
					};
				}
				return part;
			}),
		})) as UIMessage[];

		return converted;
	}, [threadContext.type, messages]);

	// Use Vercel AI SDK with custom transport and preloaded messages
	const {
		messages: uiMessages,
		status,
		sendMessage: vercelSendMessage,
		setMessages,
	} = useVercelChat({
		id: threadContext.clientId,
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
			selectedModelId: string,
			attachments?: Id<"files">[],
			webSearchEnabledOverride?: boolean,
		) => {
			if (threadContext.type === "new") {
				// Update URL using replaceState for seamless navigation
				window.history.replaceState({}, "", `/chat/${threadContext.clientId}`);
			}

      setMessages([
        {
          id: nanoid(),
          role: "user",
          parts: [{ type: "text", text: message }],
        },
      ]);

      createThreadOptimistic({clientId: threadContext.clientId})

			// try {
			// 	await vercelSendMessage(
			// 		{
			// 			role: "user",
			// 			parts: [{ type: "text", text: message }],
			// 		},
			// 		{
			// 			body: {
			// 				threadId: resolvedThreadId,
			// 				clientId: threadContext.clientId,
			// 				modelId: selectedModelId,
			// 				webSearchEnabled: webSearchEnabledOverride || false,
			// 				attachments,
			// 			},
			// 		},
			// 	);
			// } catch (error) {
			// 	throw error;
			// }
		},
		[vercelSendMessage, resolvedThreadId, threadContext.clientId, createThreadOptimistic, setMessages],
	);

	return {
		// Messages
		messages: uiMessages,
		isEmpty,
		totalMessages,

		// Status - direct from Vercel AI SDK
		status,
		canSendMessage,

		// Actions
		sendMessage,

		// User settings
		defaultModel,
	};
}
