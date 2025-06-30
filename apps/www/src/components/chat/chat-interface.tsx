"use client";

import { env } from "@/env";
import { useMessages } from "@/hooks/use-messages";
import { isClientId, nanoid } from "@/lib/nanoid";
import { useChat } from "@ai-sdk/react";
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
	preloadedThreadById,
	preloadedThreadByClientId,
	preloadedMessages,
	preloadedUser,
	preloadedUserSettings,
}: ChatInterfaceProps = {}) {
	const pathname = usePathname();
	const router = useRouter();

	// Extract data from preloaded queries if available
	// We need to call hooks unconditionally due to React rules
	const threadById = preloadedThreadById ? (() => {
		try {
			return usePreloadedQuery(preloadedThreadById);
		} catch {
			return null;
		}
	})() : null;
	
	const threadByClientId = preloadedThreadByClientId ? (() => {
		try {
			return usePreloadedQuery(preloadedThreadByClientId);
		} catch {
			return null;
		}
	})() : null;
	
	const userSettings = preloadedUserSettings ? (() => {
		try {
			return usePreloadedQuery(preloadedUserSettings);
		} catch {
			return null;
		}
	})() : null;
	
	const messages = preloadedMessages ? (() => {
		try {
			const result = usePreloadedQuery(preloadedMessages);
			console.log("Preloaded messages extracted:", result);
			return result;
		} catch (error) {
			console.error("Failed to extract preloaded messages:", error);
			return null;
		}
	})() : null;
	
	console.log("preloadedMessages prop:", preloadedMessages);
	console.log("messages after extraction:", messages);
	
	const threadId = threadById?._id || threadByClientId?._id || null;

	const clientId = useMemo(() => {
		if (pathname === "/chat") {
			// For new chats, generate a stable clientId
			return nanoid();
		}
		const match = pathname.match(/^\/chat\/(.+)$/);
		if (!match) return null;
		const id = match[1];
		return isClientId(id) ? id : null;
	}, [pathname]);

	const defaultModel = userSettings?.preferences?.defaultModel || "gpt-4o-mini";

	const authToken = useAuthToken();

	// Construct Convex HTTP endpoint URL
	const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;
	const streamUrl = useMemo(() => {
		let convexSiteUrl: string;
		if (convexUrl.includes(".cloud")) {
			convexSiteUrl = convexUrl.replace(/\.cloud.*$/, ".site");
		} else {
			const url = new URL(convexUrl);
			url.port = String(Number(url.port) + 1);
			convexSiteUrl = url.toString().replace(/\/$/, "");
		}
		return `${convexSiteUrl}/stream-chat`;
	}, [convexUrl]);

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
				const requestBody = body as any;

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
						attachments: requestBody?.attachments,
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
	}, [streamUrl, authToken, threadId, clientId, defaultModel]);

	// Load messages from Convex only to check if thread is empty
	const { isEmpty: convexIsEmpty } = useMessages({
		threadId,
		clientId,
	});

	// Convert preloaded messages to Vercel AI SDK format for initialization
	const initialMessages = useMemo(() => {
		if (!messages) {
			console.log("No preloaded messages available");
			return undefined;
		}
		if (!Array.isArray(messages) || messages.length === 0) {
			console.log("Preloaded messages is empty array or not array");
			return undefined;
		}

		console.log("Converting preloaded messages:", messages.length, "messages");
		console.log("First message sample:", messages[0]);

		// Convert Convex messages to Vercel AI UIMessage format
		const converted: UIMessage[] = messages.map((msg) => ({
			id: msg._id,
			role: msg.messageType === "user" ? "user" as const : "assistant" as const,
			parts: (msg.parts || []).map((part: any) => {
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
		
		console.log("Converted messages:", converted);
		return converted;
	}, [messages]);

	console.log("useChat params:", {
		id: threadId || clientId || "new-chat",
		hasTransport: !!transport,
		initialMessagesCount: initialMessages?.length,
	});

	// Use Vercel AI SDK with custom transport
	const {
		messages: uiMessages,
		status,
		sendMessage: vercelSendMessage,
	} = useChat({
		id: threadId || clientId || "new-chat",
		transport,
		generateId: () => nanoid(),
		messages: initialMessages,
		onError: (error) => {
			console.error("Chat error:", error);
		},
	});

	// Debug log to trace message flow
	useEffect(() => {
		console.log("useChat hook state:", {
			uiMessagesCount: uiMessages.length,
			uiMessages: uiMessages,
			status: status,
			initialMessagesProvided: !!initialMessages,
			initialMessagesCount: initialMessages?.length,
		});
	}, [uiMessages, status, initialMessages]);

	// Track if we're waiting for AI response
	const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

	// Always use Vercel AI SDK messages as the single source of truth
	const displayMessages = useMemo(() => {
		console.log("displayMessages - uiMessages count:", uiMessages.length);
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
