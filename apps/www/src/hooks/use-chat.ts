"use client";

import { useThreadContextStore } from "@/components/providers/thread-context-provider";
import { nanoid } from "@/lib/nanoid";
import { useChat as useVercelChat } from "@ai-sdk/react";
import { useAuthToken } from "@convex-dev/auth/react";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { DbMessagePart } from "../../convex/types";
import type { ModelId } from "../lib/ai/schemas";
import type { UIMessage, ValidThread } from "../types/schema";
import { useChatTransport } from "./use-chat-transport";
import { useCreateSubsequentMessages } from "./use-create-subsequent-messages";
import { useCreateThreadWithFirstMessages } from "./use-create-thread-with-first-messages";

interface UseChatProps {
	/** The chat context - type and clientId */
	threadContext: ValidThread;
	dbMessages: Doc<"messages">[] | undefined;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}

/**
 * Core chat hook that manages all chat state and interactions
 * Uses Vercel AI SDK with custom Convex transport for streaming
 */
export function useChat({
	threadContext,
	dbMessages,
	preloadedUserSettings,
}: UseChatProps) {
	const authToken = useAuthToken();
	const createThreadOptimistic = useCreateThreadWithFirstMessages();
	const createMessageOptimistic = useCreateSubsequentMessages();
	const transitionToExisting = useThreadContextStore(
		(state) => state.transitionToExisting,
	);
	const threadContextFromStore = useThreadContextStore(
		(state) => state.threadContext,
	);
	const setThreadId = useThreadContextStore((state) => state.setThreadId);
	const thread = useQuery(api.threads.getByClientId, {
		clientId: threadContext.clientId,
	});

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

	// Convert preloaded messages to Vercel AI SDK format - only for existing chats
	const initialMessages = useMemo(() => {
		// Only process messages for existing chats to prevent leakage to new chats
		if (
			threadContext.type === "new" ||
			!dbMessages ||
			dbMessages.length === 0
		) {
			return [];
		}

		// Convert Convex messages to Vercel AI UIMessage format
		const converted: UIMessage[] = dbMessages.map((msg) => ({
			id: msg._id,
			role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
			parts: (msg.parts || []).map((part: DbMessagePart) => {
				if (part.type === "text") {
					return {
						type: "text",
						text: part.text,
					};
				}

				if (part.type === "reasoning") {
					return {
						type: "reasoning",
						text: part.text,
					};
				}
			}) as UIMessage["parts"],
		}));

		return converted;
	}, []);

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

	// // Explicitly clear messages when transitioning to a new chat to prevent message leakage
	// // This addresses a limitation in Vercel AI SDK where messages persist when the ID changes
	useEffect(() => {
		if (threadContext.type === "new" && uiMessages.length > 0) {
			setMessages([]);
		}
	}, [threadContext.clientId, threadContext.type, setMessages, uiMessages.length]);

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

			if (threadContextFromStore.type === "new") {
				// Update URL using replaceState for seamless navigation
				window.history.replaceState({}, "", `/chat/${threadContext.clientId}`);
				const data = await createThreadOptimistic({
					clientThreadId: threadContext.clientId,
					message: { type: "text", text: message },
					modelId: selectedModelId,
				});
				userMessageId = data.userMessageId;
				assistantMessageId = data.assistantMessageId;

				// Transition thread context from "new" to "existing"
				transitionToExisting(threadContextFromStore.clientId);
				setThreadId(data.threadId);
			}

			if (threadContextFromStore.type === "existing") {
				if (!thread?._id) {
					console.error("Thread not found", {
						threadContext,
					});
					return;
				}

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
						threadClientId: threadContext.clientId,
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
			threadContext.clientId,
			createThreadOptimistic,
			createMessageOptimistic,
			thread?._id,
			setMessages,
			transitionToExisting,
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
