"use client";

import { api } from "@/convex/_generated/api";
import type { ModelId } from "@/lib/ai";
import { SimpleFetchTransport } from "@/lib/ai/simple-fetch-transport";
import { isClientId } from "@/lib/nanoid";
import { useChat as useVercelChat } from "@ai-sdk/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { useMutation, usePreloadedQuery, useQuery } from "convex/react";
import { nanoid } from "nanoid";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";
import type { UIMessage } from "@ai-sdk/react";
import type { Preloaded } from "convex/react";
import type { Doc, Id } from "../../convex/_generated/dataModel";

interface UseChatOptions {
	preloadedThreadById?: Preloaded<typeof api.threads.get>;
	preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>;
	preloadedMessages?: Preloaded<typeof api.messages.list>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}

// Helper to merge Convex messages with streaming state
function mergeMessagesWithStreamingState(
	_convexMessages: Doc<"messages">[],
	uiMessages: UIMessage[],
): UIMessage[] {
	// For now, just return uiMessages as they contain the streaming state
	// In the future, we might want to merge with Convex messages for persistence
	return uiMessages;
}

export function useChat(options: UseChatOptions = {}) {
	const router = useRouter();
	const pathname = usePathname();
	const authToken = useAuthToken();
	const lastAssistantMessageId = useRef<Id<"messages"> | null>(null);

	// Parse the current path
	const pathSegments = pathname.split("/").filter(Boolean);
	const isNewChat = pathSegments[0] === "chat" && pathSegments.length === 1;
	const currentThreadId = pathSegments[0] === "chat" && pathSegments[1];
	const isSettingsPage = pathSegments[0] === "chat" && pathSegments[1] === "settings";
	const currentClientId = currentThreadId && isClientId(currentThreadId) ? currentThreadId : undefined;

	// Load thread data
	const threadById = options.preloadedThreadById
		? usePreloadedQuery(options.preloadedThreadById)
		: useQuery(
				api.threads.get,
				currentThreadId && !isClientId(currentThreadId)
					? { threadId: currentThreadId as Id<"threads"> }
					: "skip",
			);
	
	const threadByClientId = options.preloadedThreadByClientId
		? usePreloadedQuery(options.preloadedThreadByClientId)
		: useQuery(
				api.threads.getByClientId,
				currentClientId ? { clientId: currentClientId } : "skip",
			);
	
	const currentThread = threadByClientId || threadById;

	// Load messages
	const messages = options.preloadedMessages
		? usePreloadedQuery(options.preloadedMessages)
		: useQuery(
				api.messages.list,
				currentThread ? { threadId: currentThread._id } : "skip",
			) || [];

	// Load user settings
	const userSettings = options.preloadedUserSettings
		? usePreloadedQuery(options.preloadedUserSettings)
		: useQuery(api.userSettings.getUserSettings);

	// Thread mutations
	const createThread = useMutation(api.threads.create);
	const shareThread = useMutation(api.share.shareThread);
	const unshareThread = useMutation(api.share.unshareThread);

	// Settings from user or defaults
	const modelId = (userSettings?.preferences?.defaultModel as ModelId) || "gpt-4o";
	const webSearchEnabled = false; // TODO: Add web search preference to user settings

	// Share state
	const shareId = currentThread?.shareId || null;
	const isShared = currentThread?.isPublic || false;

	// Auth token is already available from useAuthToken hook

	// Build the Convex HTTP endpoint URL
	const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
	const streamUrl = `${convexUrl.replace(".convex.cloud", ".convex.site")}/http/streamChatResponseV2`;

	// Determine the chat ID
	const chatId = currentClientId || currentThread?._id || "new";

	// Create transport with auth and config
	const transport = useMemo(() => {
		return new SimpleFetchTransport({
			streamUrl,
			authToken,
			modelId,
			webSearchEnabled,
		});
	}, [streamUrl, authToken, modelId, webSearchEnabled]);

	// Use Vercel AI SDK's useChat with transport
	const {
		messages: uiMessages,
		sendMessage,
		stop,
		error,
		setMessages: setUIMessages,
	} = useVercelChat({
		id: chatId,
		transport,
		generateId: () => nanoid(),
		onFinish: async ({ message }) => {
			console.log("[use-chat-v2-simplified] Message finished:", message);
			if (message.role === "assistant") {
				lastAssistantMessageId.current = message.id as Id<"messages">;
			}
		},
		onError: (error) => {
			console.error("[use-chat-v2-simplified] Chat error:", error);
		},
	});

	// Merge messages with streaming state
	const mergedMessages = useMemo(() => {
		return mergeMessagesWithStreamingState(messages, uiMessages);
	}, [messages, uiMessages]);

	// Custom send message handler
	const handleSendMessage = useCallback(
		async ({
			message,
			modelId: messageModelId,
			attachments,
		}: {
			message: string;
			modelId?: ModelId;
			attachments?: Id<"files">[];
			isRetry?: boolean;
		}) => {
			console.log("[use-chat-v2-simplified] handleSendMessage called");
			
			const finalModelId = messageModelId || modelId;

			// For new chats, create thread first
			if (isNewChat) {
				const clientId = nanoid();
				console.log("[use-chat-v2-simplified] Creating new thread with clientId:", clientId);
				
				createThread({
					title: "",
					clientId,
				});
				
				console.log("[use-chat-v2-simplified] Navigating to:", `/chat/${clientId}`);
				router.replace(`/chat/${clientId}`);
			}

			// Use the sendMessage method to send the message
			await sendMessage(
				{
					role: "user",
					parts: [{ type: "text", text: message }],
				} as UIMessage,
				{
					body: {
						modelId: finalModelId,
						attachments,
						webSearchEnabled,
					},
				},
			);
		},
		[isNewChat, modelId, webSearchEnabled, createThread, router, sendMessage],
	);

	// Clear history
	const handleClearHistory = useCallback(() => {
		console.log("Clear history not implemented");
		router.push("/chat");
	}, [router]);

	// Share handlers
	const handleShareThread = useCallback(async () => {
		if (!currentThread) return null;
		return await shareThread({ threadId: currentThread._id });
	}, [currentThread, shareThread]);

	const handleUnshareThread = useCallback(async () => {
		if (!currentThread) return;
		await unshareThread({ threadId: currentThread._id });
	}, [currentThread, unshareThread]);

	return {
		// Thread state
		currentThread,
		isNewChat,
		isSettingsPage,
		shareId,
		isShared,

		// Messages
		messages: messages || [],
		uiMessages: mergedMessages,
		setMessages: setUIMessages,

		// User settings
		modelId,
		webSearchEnabled,

		// Chat actions
		sendMessage: handleSendMessage,
		regenerate: () => {}, // TODO: Implement regenerate
		cancelGeneration: stop,
		clearHistory: handleClearHistory,

		// Share actions
		shareThread: handleShareThread,
		unshareThread: handleUnshareThread,

		// Chat state
		status: uiMessages.some(m => m.role === "assistant" && (!m.parts || m.parts.length === 0)) ? "in_progress" : "awaiting_message",
		error,
		isGenerating: uiMessages.some(m => m.role === "assistant" && (!m.parts || m.parts.length === 0)),
		lastAssistantMessageId: lastAssistantMessageId.current,
	};
}