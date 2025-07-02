"use client";

import type { MessagePart } from "@/lib/message-parts";
import { nanoid } from "@/lib/nanoid";
import { useChat as useVercelChat } from "@ai-sdk/react";
import { useAuthToken } from "@convex-dev/auth/react";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { useCallback, useMemo } from "react";
import type { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ModelId } from "../lib/ai/schemas";
import type { UIMessage, ValidThread } from "../types/schema";
import { useChatTransport } from "./use-chat-transport";
import { useOptimisticThreadCreate } from "./use-optimistic-thread-create";

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
	let userSettings = null;
	let messages = null;

	if (preloadedUserSettings) {
		userSettings = usePreloadedQuery(preloadedUserSettings);
	}

	if (preloadedMessages) {
		messages = usePreloadedQuery(preloadedMessages);
	}

	const defaultModel = userSettings?.preferences?.defaultModel || "gpt-4o-mini";

	// Create transport using the dedicated hook
	const transport = useChatTransport({
		authToken,
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
				msg.role === "user" ? ("user" as const) : ("assistant" as const),
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
			metadata: {
				createdAt: new Date(msg._creationTime),
			},
		})) as UIMessage[];

		return converted;
	}, [threadContext.type, threadContext.clientId]);

	// Use Vercel AI SDK with custom transport and preloaded messages
	const {
		messages: uiMessages,
		status,
		sendMessage: vercelSendMessage,
		setMessages,
	} = useVercelChat<UIMessage>({
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
			selectedModelId: ModelId,
			attachments?: Id<"files">[],
			webSearchEnabledOverride?: boolean,
		) => {
			if (threadContext.type === "new") {
				// Update URL using replaceState for seamless navigation
				window.history.replaceState({}, "", `/chat/${threadContext.clientId}`);
			}

			createThreadOptimistic({
				clientThreadId: threadContext.clientId,
				message: { type: "text", text: message },
				modelId: selectedModelId,
			});

			try {
				// TODO: Temporarily disabled for optimistic message creation
				// await vercelSendMessage(
				// 	{
				// 		role: "user",
				// 		parts: [{ type: "text", text: message }],
				// 	},
				// 	{
				// 		body: {
				// 			clientId: threadContext.clientId,
				// 			modelId: selectedModelId,
				// 			webSearchEnabled: webSearchEnabledOverride || false,
				// 			attachments,
				// 		},
				// 	},
				// );
			} catch (error) {
				throw error;
			}
		},
		[
			vercelSendMessage,
			threadContext.clientId,
			createThreadOptimistic,
			setMessages,
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

		// Actions
		sendMessage,

		// User settings
		defaultModel,
	};
}
