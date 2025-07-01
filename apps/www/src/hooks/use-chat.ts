"use client";

import { env } from "@/env";
import { createStreamUrl } from "@/lib/create-base-url";
import type { MessagePart } from "@/lib/message-parts";
import { nanoid } from "@/lib/nanoid";
import { useChat as useVercelChat } from "@ai-sdk/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useOptimisticThreadCreate } from "./use-optimistic-thread-create";

type ChatState = "new" | "existing";

interface UseChatProps {
	preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>;
	preloadedMessages?: Preloaded<typeof api.messages.listByClientId>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
	fallbackChatId?: string;
}

/**
 * Core chat hook that manages all chat state and interactions
 * Uses Vercel AI SDK with custom Convex transport for streaming
 */
export function useChat({
	preloadedThreadByClientId,
	preloadedMessages,
	preloadedUserSettings,
	fallbackChatId,
}: UseChatProps = {}) {
	const pathname = usePathname();
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

	// Determine chat state and extract client ID from pathname
	const { chatState, clientId } = useMemo(() => {
		console.log("[use-chat] pathname changed:", pathname);

		if (pathname === "/chat") {
			console.log("[use-chat] detected new chat state");
			return { chatState: "new" as ChatState, clientId: null };
		}

		const match = pathname.match(/^\/chat\/(.+)$/);
		if (!match) {
			console.log("[use-chat] no match for chat path, defaulting to new");
			return { chatState: "new" as ChatState, clientId: null };
		}

		console.log(
			"[use-chat] detected existing chat state with clientId:",
			match[1],
		);
		return { chatState: "existing" as ChatState, clientId: match[1] };
	}, [pathname]);

	// Get the resolved thread ID from the clientId (if thread exists)
	const resolvedThreadId = threadByClientId?._id || null;

	const defaultModel = userSettings?.preferences?.defaultModel || "gpt-4o-mini";

	// Construct Convex HTTP endpoint URL
	const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;
	const streamUrl = createStreamUrl(convexUrl);

	// Create transport with proper Convex integration
	const transport = useMemo(() => {
		if (!authToken) return undefined;

		return new DefaultChatTransport({
			api: streamUrl,
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
			prepareSendMessagesRequest: ({
				messages,
				body,
				headers,
				credentials,
				api,
				trigger,
			}) => {
				const requestBody = body as Record<string, unknown>;

				const convexBody = {
					threadId: requestBody?.threadId || resolvedThreadId,
					clientId: requestBody?.clientId || clientId,
					modelId: requestBody?.modelId || defaultModel,
					messages: messages,
					options: {
						webSearchEnabled: requestBody?.webSearchEnabled || false,
						attachments: requestBody?.attachments as Id<"files">[] | undefined,
						trigger,
					},
				};

				return {
					api: api,
					headers: headers,
					body: convexBody,
					credentials: credentials,
				};
			},
		});
	}, [authToken, resolvedThreadId, clientId, defaultModel, streamUrl]);

	// Convert preloaded messages to Vercel AI SDK format - only for existing chats
	const initialMessages = useMemo(() => {
		// Only process messages for existing chats to prevent leakage to new chats
		if (chatState !== "existing" || !messages || messages.length === 0) {
			console.log("[use-chat] initialMessages: returning undefined for", {
				chatState,
				hasMessages: !!messages,
			});
			return undefined;
		}

		console.log(
			"[use-chat] initialMessages: converting",
			messages.length,
			"messages for existing chat",
		);

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
			metadata: {
				modelId: msg.modelId,
				isComplete: true,
				isStreaming: false,
				thinkingStartedAt: msg.thinkingStartedAt,
				thinkingCompletedAt: msg.thinkingCompletedAt,
				usage: msg.usage,
			},
		})) as UIMessage[];

		return converted;
	}, [chatState, messages]);

	// Generate chatId based on chat state
	const chatId = useMemo(() => {
		const id =
			chatState === "existing"
				? clientId! // We know clientId exists for existing chats
				: fallbackChatId || nanoid(); // Use server ID for new chats, nanoid as fallback

		console.log("[use-chat] chatId generation:", {
			chatState,
			clientId,
			fallbackChatId,
			finalChatId: id,
			pathname,
		});

		return id;
	}, [chatState, clientId, fallbackChatId, pathname]);

	// Use Vercel AI SDK with custom transport and preloaded messages
	const {
		messages: uiMessages,
		status,
		sendMessage: vercelSendMessage,
	} = useVercelChat({
		id: chatId,
		transport,
		generateId: () => nanoid(),
		messages: initialMessages, // initialMessages already handles the chatState logic
		onError: (error) => {
			console.error("Chat error:", error);
		},
	});

	// Debug logging
	console.log("[use-chat] Vercel AI state:", {
		chatState,
		chatId,
		uiMessagesCount: uiMessages.length,
		status,
		pathname,
		clientId,
	});

	// Computed values
	const isEmpty = uiMessages.length === 0;
	const totalMessages = uiMessages.length;
	const canSendMessage = status !== "streaming" && !!authToken;
	const isNewChat = chatState === "new";

	// Adapt sendMessage to use Vercel AI SDK v5 with transport
	const sendMessage = useCallback(
		async (
			message: string,
			selectedModelId: string,
			attachments?: Id<"files">[],
			webSearchEnabledOverride?: boolean,
		) => {
			// Handle URL update and thread creation for new chats
			let chatClientId = clientId;
			let threadIdToUse = resolvedThreadId;

			if (chatState === "new") {
				// Use the same chatId that was passed to useVercelChat for consistency
				chatClientId = chatId;

				// Create thread and messages optimistically FIRST (instant UI update)
				try {
					// This will instantly update the UI with the new thread AND messages
					const result = await createThreadOptimistic({
						clientId: chatClientId,
						title: "New chat", // Title will be generated server-side
						userMessage: message, // Include user message for optimistic creation
						modelId: selectedModelId, // Include model for optimistic creation
					});
					
					threadIdToUse = result.threadId;
					
					// Update URL after optimistic creation for seamless navigation
					window.history.replaceState({}, "", `/chat/${chatClientId}`);
					
					console.log("[use-chat] Created optimistic thread and messages:", {
						threadId: result.threadId,
						userMessageId: result.userMessageId,
						assistantMessageId: result.assistantMessageId,
					});
				} catch (error) {
					console.error("Failed to create thread optimistically:", error);
					// Continue without thread ID - HTTP endpoint will create it
					// Still update URL for navigation consistency
					window.history.replaceState({}, "", `/chat/${chatClientId}`);
				}
			}

			try {
				await vercelSendMessage(
					{
						role: "user",
						parts: [{ type: "text", text: message }],
					},
					{
						body: {
							threadId: threadIdToUse,
							clientId: chatClientId,
							modelId: selectedModelId,
							webSearchEnabled: webSearchEnabledOverride || false,
							attachments,
						},
					},
				);
			} catch (error) {
				throw error;
			}
		},
		[
			vercelSendMessage,
			resolvedThreadId,
			clientId,
			chatState,
			chatId,
			createThreadOptimistic,
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
		isNewChat,

		// Identifiers
		clientId,
		chatState,
		chatId,

		// Actions
		sendMessage,

		// User settings
		defaultModel,
	};
}
