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
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface UseChatProps {
	preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>;
	preloadedMessages?: Preloaded<typeof api.messages.listByClientId>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}

/**
 * Core chat hook that manages all chat state and interactions
 * Uses Vercel AI SDK with custom Convex transport for streaming
 */
export function useChat({
	preloadedThreadByClientId,
	preloadedMessages,
	preloadedUserSettings,
}: UseChatProps = {}) {
	const pathname = usePathname();
	const router = useRouter();
	const authToken = useAuthToken();

	// Extract data from preloaded queries if available
	let threadByClientId = null;
	let userSettings = null;
	let messages = null;

	if (preloadedThreadByClientId) {
		try {
			threadByClientId = usePreloadedQuery(preloadedThreadByClientId);
		} catch (error) {
			console.warn("Failed to extract preloaded thread by client ID:", error);
			threadByClientId = null;
		}
	}

	if (preloadedUserSettings) {
		try {
			userSettings = usePreloadedQuery(preloadedUserSettings);
		} catch (error) {
			console.warn("Failed to extract preloaded user settings:", error);
			userSettings = null;
		}
	}

	if (preloadedMessages) {
		try {
			messages = usePreloadedQuery(preloadedMessages);
		} catch (error) {
			console.warn("Failed to extract preloaded messages:", error);
			messages = null;
		}
	}

	// Extract thread and client IDs from pathname
	const pathInfo = useMemo(() => {
		if (pathname === "/chat") {
			return { type: "new", threadId: null, clientId: nanoid() };
		}

		const match = pathname.match(/^\/chat\/(.+)$/);
		if (!match) {
			return { type: "new", threadId: null, clientId: null };
		}

		const id = match[1];
		const resolvedThreadId = threadByClientId?._id || null;
		return { type: "clientId", threadId: resolvedThreadId, clientId: id };
	}, [pathname, threadByClientId]);

	const threadId = pathInfo.threadId;
	const clientId = pathInfo.clientId;

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
					threadId:
						requestBody?.threadId ||
						(threadId !== "new-chat" ? threadId : null),
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
	}, [authToken, threadId, clientId, defaultModel, streamUrl]);

	// Convert preloaded messages to Vercel AI SDK format
	const initialMessages = useMemo(() => {
		if (!messages || messages.length === 0) {
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
	}, [messages]);

	// Use Vercel AI SDK with custom transport and preloaded messages
	const {
		messages: uiMessages,
		status,
		sendMessage: vercelSendMessage,
	} = useVercelChat({
		id: threadId || clientId || "new-chat",
		transport,
		generateId: () => nanoid(),
		messages: initialMessages,
		onError: (error) => {
			console.error("Chat error:", error);
		},
	});

	// Track if we're waiting for AI response
	const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

	// Always use Vercel AI SDK messages as the single source of truth
	const displayMessages = useMemo(() => {
		const messages: UIMessage[] = [...uiMessages];

		// Add optimistic thinking message if waiting for response
		if (isWaitingForResponse && messages.length > 0) {
			const lastMessage = messages[messages.length - 1];
			// Only add thinking indicator if the last message is from user
			if (lastMessage.role === "user") {
				const selectedModel =
					userSettings?.preferences?.defaultModel || "gpt-4o-mini";
				messages.push({
					id: `thinking-${Date.now()}`,
					role: "assistant",
					parts: [],
					metadata: {
						modelId: selectedModel,
						isStreaming: true,
						isComplete: false,
					},
				});
			}
		}

		return messages;
	}, [
		uiMessages,
		isWaitingForResponse,
		userSettings?.preferences?.defaultModel,
	]);

	// Computed values
	const isEmpty = uiMessages.length === 0;
	const totalMessages = displayMessages.length;
	const isStreaming = status === "streaming";
	const canSendMessage = !isStreaming && !!authToken;
	const isNewChat = pathname === "/chat" && isEmpty;
	const isAIGenerating = isStreaming;

	// Track if user has ever sent a message to prevent flicker
	const hasEverSentMessage = useRef(false);

	// Reset when we're in a truly new chat, set when messages exist
	useEffect(() => {
		if (isNewChat && totalMessages === 0) {
			hasEverSentMessage.current = false;
		} else if (totalMessages > 0) {
			hasEverSentMessage.current = true;
		}
	}, [isNewChat, totalMessages]);

	// Clear waiting state when streaming starts
	useEffect(() => {
		if (isStreaming) {
			setIsWaitingForResponse(false);
		}
	}, [isStreaming]);

	// Adapt sendMessage to use Vercel AI SDK v5 with transport
	const sendMessage = useCallback(
		async (
			message: string,
			selectedModelId: string,
			attachments?: Id<"files">[],
			webSearchEnabledOverride?: boolean,
		) => {
			// For new chats, navigate immediately using clientId
			if (!threadId && clientId) {
				router.replace(`/chat/${clientId}`);
			}

			// Show thinking indicator optimistically
			setIsWaitingForResponse(true);

			try {
				await vercelSendMessage(
					{
						role: "user",
						parts: [{ type: "text", text: message }],
					},
					{
						body: {
							threadId,
							clientId,
							modelId: selectedModelId,
							webSearchEnabled: webSearchEnabledOverride || false,
							attachments,
						},
					},
				);
			} catch (error) {
				// Clear waiting state on error
				setIsWaitingForResponse(false);
				throw error;
			}
		},
		[vercelSendMessage, threadId, clientId, router],
	);

	return {
		// Messages
		messages: displayMessages,
		uiMessages,
		isEmpty,
		totalMessages,

		// Status
		isStreaming,
		isAIGenerating,
		isWaitingForResponse,
		canSendMessage,
		isNewChat,
		hasEverSentMessage,
		isDisabled: !canSendMessage || isStreaming,

		// Identifiers
		threadId,
		clientId,

		// Actions
		sendMessage,

		// User settings
		defaultModel,
	};
}
