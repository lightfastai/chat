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
	const authToken = useAuthToken();

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

	// Extract client ID from pathname
	const clientId = useMemo(() => {
		if (pathname === "/chat") {
			return nanoid();
		}

		const match = pathname.match(/^\/chat\/(.+)$/);
		if (!match) {
			return null;
		}

		return match[1];
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

	// Use stable ID for Vercel AI SDK to prevent state reset
	const chatId = clientId || "new-chat";
	
	// Use Vercel AI SDK with custom transport and preloaded messages
	const {
		messages: uiMessages,
		status,
		sendMessage: vercelSendMessage,
	} = useVercelChat({
		id: chatId,
		transport,
		generateId: () => nanoid(),
		messages: initialMessages,
		onError: (error) => {
			console.error("Chat error:", error);
		},
	});

	// Debug logging
	console.log("[use-chat] chatId:", chatId, "uiMessages:", uiMessages, "status:", status);
	// Computed values
	const isEmpty = uiMessages.length === 0;
	const totalMessages = uiMessages.length;
	const canSendMessage = status !== "streaming" && !!authToken;
	const isNewChat = pathname === "/chat" && isEmpty;

	// Adapt sendMessage to use Vercel AI SDK v5 with transport
	const sendMessage = useCallback(
		async (
			message: string,
			selectedModelId: string,
			attachments?: Id<"files">[],
			webSearchEnabledOverride?: boolean,
		) => {
			// For new chats at /chat, update URL using replaceState for seamless navigation
			if (pathname === "/chat" && clientId) {
				window.history.replaceState({}, "", `/chat/${clientId}`);
			}

			try {
				await vercelSendMessage(
					{
						role: "user",
						parts: [{ type: "text", text: message }],
					},
					{
						body: {
							threadId: resolvedThreadId,
							clientId,
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
		[vercelSendMessage, resolvedThreadId, clientId, pathname],
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

		// Actions
		sendMessage,

		// User settings
		defaultModel,
	};
}
