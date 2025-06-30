"use client";

import { env } from "@/env";
import { useMessages } from "@/hooks/use-messages";
import { nanoid } from "@/lib/nanoid";
import { createStreamUrl } from "@/lib/create-base-url";
import { useChat as useVercelChat } from "@ai-sdk/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CenteredChatStart } from "./centered-chat-start";
import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";

interface ChatInterfaceProps {
	preloadedThreadById?: Preloaded<typeof api.threads.get>;
	preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>;
	preloadedMessages?: Preloaded<typeof api.messages.list>;
	preloadedUser?: Preloaded<typeof api.users.current>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}

export function ChatInterface({
	preloadedThreadByClientId,
	preloadedMessages,
	preloadedUser,
	preloadedUserSettings,
}: ChatInterfaceProps = {}) {
	const pathname = usePathname();
	const router = useRouter();

	// Extract data from preloaded queries if available
	// Use proper try-catch pattern matching sidebar implementation
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
	
	
	// Extract thread and client IDs properly
	// Since uri is always clientId, we don't need isClientId check
	const pathInfo = useMemo(() => {
		if (pathname === "/chat") {
			return { type: "new", threadId: null, clientId: nanoid() };
		}

		const match = pathname.match(/^\/chat\/(.+)$/);
		if (!match) {
			return { type: "new", threadId: null, clientId: null };
		}

		const id = match[1];

		// For client IDs, threadId comes from resolved data
		const resolvedThreadId = threadByClientId?._id || null;
		return { type: "clientId", threadId: resolvedThreadId, clientId: id };
	}, [pathname, threadByClientId]);

	const threadId = pathInfo.threadId;
	const clientId = pathInfo.clientId;

	const defaultModel = userSettings?.preferences?.defaultModel || "gpt-4o-mini";

	const authToken = useAuthToken();

	// Construct Convex HTTP endpoint URL using utility
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
				// Transform the request to match Convex HTTP streaming format
				const requestBody = body as Record<string, unknown>;

				// Use threadId and clientId from the request body
				const convexBody = {
					threadId:
						requestBody?.threadId ||
						(threadId !== "new-chat" ? threadId : null),
					clientId: requestBody?.clientId || clientId,
					modelId: requestBody?.modelId || defaultModel,
					messages: messages, // Send UIMessages directly
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
	}, [authToken, threadId, clientId, defaultModel]);

	// Load messages from Convex with staging's priority logic
	const { isEmpty: convexIsEmpty, messages: convexMessages } = useMessages({
		threadId,
		clientId,
	});

	// Apply staging's priority system: preloaded → convex → empty
	const prioritizedMessages = useMemo(() => {
		// Use messages in this priority order (same as staging):
		// 1. Preloaded messages (SSR)
		// 2. Live Convex messages (client queries)
		// 3. Empty array fallback
		if (messages && Array.isArray(messages) && messages.length > 0) {
			return messages;
		}
		
		if (convexMessages && convexMessages.length > 0) {
			// Convert from MessageWithStatus to raw messages
			return convexMessages.map(msgWithStatus => msgWithStatus.message);
		}
		
		return [];
	}, [messages, convexMessages]);

	// Convert prioritized messages to Vercel AI SDK format for initialization
	const initialMessages = useMemo(() => {
		if (prioritizedMessages.length === 0) {
			return undefined;
		}

		// Convert Convex messages to Vercel AI UIMessage format
		const converted: UIMessage[] = prioritizedMessages.map((msg) => ({
			id: msg._id,
			role: msg.messageType === "user" ? "user" as const : "assistant" as const,
			parts: (msg.parts || []).map((part) => {
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
		}));
		
		return converted;
	}, [prioritizedMessages]);


	// Use Vercel AI SDK with custom transport
	const {
		messages: uiMessages,
		status,
		sendMessage: vercelSendMessage,
		setMessages,
	} = useVercelChat({
		id: threadId || clientId || "new-chat",
		transport,
		generateId: () => nanoid(),
		onError: (error) => {
			console.error("Chat error:", error);
		},
	});

	// Manually set messages when initial messages become available
	useEffect(() => {
		if (initialMessages && initialMessages.length > 0 && uiMessages.length === 0) {
			setMessages(initialMessages);
		}
	}, [initialMessages, uiMessages.length, setMessages]);


	// Track if we're waiting for AI response
	const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

	// Always use Vercel AI SDK messages as the single source of truth
	const displayMessages = useMemo(() => {
		let messages: UIMessage[] = [...uiMessages];

		// Add optimistic thinking message if waiting for response
		if (isWaitingForResponse && messages.length > 0) {
			const lastMessage = messages[messages.length - 1];
			// Only add thinking indicator if the last message is from user
			if (lastMessage.role === "user") {
				const selectedModel = userSettings?.preferences?.defaultModel || "gpt-4o-mini";
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
	}, [uiMessages, isWaitingForResponse, userSettings?.preferences?.defaultModel]);

	// Computed values for compatibility
	const isEmpty = convexIsEmpty && uiMessages.length === 0;
	const totalMessages = displayMessages.length;
	const isStreaming = status === "streaming";
	const canSendMessage = !isStreaming && !!authToken;

	// Determine if this is a new chat
	// Only show new chat UI if we're at /chat (no thread ID or client ID in URL)
	const isNewChat = pathname === "/chat" && isEmpty;

	// Adapt sendMessage to use Vercel AI SDK v5 with transport
	const handleSendMessage = useCallback(
		async (
			message: string,
			selectedModelId: string,
			attachments?: Id<"files">[],
			_webSearchEnabledOverride?: boolean,
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
							webSearchEnabled: false,
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

	// Determine if chat is disabled
	const isDisabled = !canSendMessage || isStreaming;

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

	// Check if AI is currently generating (using Vercel streaming state)
	const isAIGenerating = isStreaming;

	// Clear waiting state when streaming starts
	useEffect(() => {
		if (isStreaming) {
			setIsWaitingForResponse(false);
		}
	}, [isStreaming]);


	// Show centered layout only for truly new chats that have never had messages
	if (isNewChat && !hasEverSentMessage.current) {
		return (
			<CenteredChatStart
				onSendMessage={handleSendMessage}
				disabled={isDisabled}
				isLoading={isAIGenerating}
				preloadedUser={preloadedUser}
			/>
		);
	}

	return (
		<div className="flex flex-col h-full ">
			<ChatMessages messages={displayMessages} isLoading={isAIGenerating} />
			<ChatInput
				onSendMessage={handleSendMessage}
				disabled={isDisabled}
				isLoading={isAIGenerating}
			/>
		</div>
	);
}
