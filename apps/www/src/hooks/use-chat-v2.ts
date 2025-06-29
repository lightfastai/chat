"use client";

import { env } from "@/env";
import type { ModelId } from "@/lib/ai";
import { getProviderFromModelId } from "@/lib/ai";
import { ConvexChatTransport } from "@/lib/ai/convex-chat-transport";
import {
	convexMessagesToUIMessages,
	mergeMessagesWithStreamingState,
} from "@/lib/ai/message-converters";
import { isClientId, nanoid } from "@/lib/nanoid";
import { useChat as useVercelChat } from "@ai-sdk/react";
import { useAuthToken } from "@convex-dev/auth/react";
import type { UIMessage } from "ai";
import {
	type Preloaded,
	useMutation,
	usePreloadedQuery,
	useQuery,
} from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

interface UseChatOptions {
	preloadedThreadById?: Preloaded<typeof api.threads.get>;
	preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>;
	preloadedMessages?: Preloaded<typeof api.messages.list>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}

export function useChat(options: UseChatOptions = {}) {
	const pathname = usePathname();
	const router = useRouter();
	const authToken = useAuthToken();

	// Extract current thread info from pathname with clientId support
	const pathInfo = useMemo(() => {
		if (pathname === "/chat") {
			return { type: "new", id: "new" };
		}

		const match = pathname.match(/^\/chat\/(.+)$/);
		if (!match) {
			return { type: "new", id: "new" };
		}

		const id = match[1];

		// Handle special routes
		if (id === "settings" || id.startsWith("settings/")) {
			return { type: "settings", id: "settings" };
		}

		// Check if it's a client-generated ID (nanoid)
		if (isClientId(id)) {
			return { type: "clientId", id };
		}

		// Otherwise it's a real Convex thread ID
		return { type: "threadId", id: id as Id<"threads"> };
	}, [pathname]);

	const currentThreadId = pathInfo.type === "threadId" ? pathInfo.id : "new";
	const currentClientId = pathInfo.type === "clientId" ? pathInfo.id : null;
	const isSettingsPage = pathInfo.type === "settings";
	const isNewChat = currentThreadId === "new" && !currentClientId;

	// Use preloaded thread data if available, otherwise fall back to regular queries
	const preloadedThreadById = options.preloadedThreadById
		? usePreloadedQuery(options.preloadedThreadById)
		: null;

	const preloadedThreadByClientId = options.preloadedThreadByClientId
		? usePreloadedQuery(options.preloadedThreadByClientId)
		: null;

	const preloadedThread = preloadedThreadById || preloadedThreadByClientId;

	// Get thread by clientId if we have one (skip for settings and if preloaded)
	const threadByClientId = useQuery(
		api.threads.getByClientId,
		currentClientId && !isSettingsPage && !preloadedThread
			? { clientId: currentClientId }
			: "skip",
	);

	// Get thread by ID for regular threads (skip for settings and if preloaded)
	const threadById = useQuery(
		api.threads.get,
		currentThreadId !== "new" && !isSettingsPage && !preloadedThread
			? { threadId: currentThreadId as Id<"threads"> }
			: "skip",
	);

	// Determine the actual thread to use
	const currentThread = preloadedThread || threadByClientId || threadById;

	// Get messages for current thread
	const messageThreadId = currentThread?._id || null;

	// Check if the thread ID is an optimistic one (not a real Convex ID)
	const isOptimisticThreadId =
		messageThreadId && !messageThreadId.startsWith("k");

	// Use preloaded messages if available
	const preloadedMessages = options.preloadedMessages
		? usePreloadedQuery(options.preloadedMessages)
		: null;

	// Get messages for current thread (skip if preloaded or optimistic)
	const convexMessages = useQuery(
		api.messages.list,
		messageThreadId && !isOptimisticThreadId && !preloadedMessages
			? { threadId: messageThreadId }
			: "skip",
	);

	const messages = preloadedMessages || convexMessages;

	// Get user settings
	const userSettings = options.preloadedUserSettings
		? usePreloadedQuery(options.preloadedUserSettings)
		: useQuery(api.userSettings.getUserSettings);

	const modelId = userSettings?.preferences?.defaultModel || ("gpt-4o-mini" as ModelId);
	const webSearchEnabled = false; // TODO: Add web search preference to user settings

	// Mutations
	const createThreadAndSend = useMutation(api.messages.createThreadAndSend);
	const sendMessageMutation = useMutation(api.messages.send);
	const deleteThread = useMutation(api.threads.deleteThread);
	// const clearHistory = useMutation(api.threads.clearAll);
	const updateThreadTitle = useMutation(api.threads.updateTitle);
	// const retryLastAssistant = useMutation(api.messages.retry);
	const branchThreadMutation = useMutation(api.threads.branchFromMessage);
	// const editMessageMutation = useMutation(api.messages.edit);
	const submitFeedback = useMutation(api.feedback.submitFeedback);
	const shareThread = useMutation(api.share.shareThread);
	const unshareThread = useMutation(api.share.unshareThread);

	// Get sharing status
	const shareId = currentThread?.shareId;
	const isShared = currentThread?.isPublic === true && !!shareId;

	// Track last assistant message ID
	const lastAssistantMessageId = useRef<Id<"messages"> | null>(null);

	// Construct Convex HTTP endpoint URL
	const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;
	let convexSiteUrl: string;
	if (convexUrl.includes(".cloud")) {
		convexSiteUrl = convexUrl.replace(/\.cloud.*$/, ".site");
	} else {
		const url = new URL(convexUrl);
		url.port = String(Number(url.port) + 1);
		convexSiteUrl = url.toString().replace(/\/$/, "");
	}
	const streamUrl = `${convexSiteUrl}/stream-chat-v2`;

	// Convert preloaded Convex messages to UIMessages
	const initialMessages = useMemo(() => {
		if (messages) {
			return convexMessagesToUIMessages(messages);
		}
		return [];
	}, [messages]);

	// Create custom transport
	const transport = useMemo(() => {
		if (!authToken) return undefined;

		return new ConvexChatTransport({
			streamUrl,
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
			convexOptions: {
				modelId,
				webSearchEnabled,
			},
		});
	}, [streamUrl, authToken, modelId, webSearchEnabled]);

	// Use Vercel AI SDK's useChat
	const {
		messages: uiMessages,
		sendMessage: vercelSendMessage,
		stop,
		error,
		status,
		regenerate,
		setMessages: setUIMessages,
	} = useVercelChat({
		id: currentThread?._id || currentClientId || "new",
		transport,
		messages: initialMessages,
		generateId: () => nanoid(), // Use our nanoid for consistency
		onFinish: async ({ message }) => {
			// Track the assistant message ID
			if (message.role === "assistant") {
				lastAssistantMessageId.current = message.id as Id<"messages">;
			}
		},
	});

	// Merge Convex real-time messages with Vercel streaming state
	const mergedMessages = useMemo(() => {
		return mergeMessagesWithStreamingState(messages, uiMessages);
	}, [messages, uiMessages]);

	// Custom send message handler
	const handleSendMessage = useCallback(
		async ({
			message,
			modelId: messageModelId,
			attachments,
			isRetry = false,
		}: {
			message: string;
			modelId?: ModelId;
			attachments?: Id<"files">[];
			isRetry?: boolean;
		}) => {
			const finalModelId = messageModelId || modelId;
			const provider = getProviderFromModelId(finalModelId);

			if (isNewChat) {
				// New chat: Create thread + send message via Convex
				const clientId = nanoid();
				router.replace(`/chat/${clientId}`);

				const convexResult = await createThreadAndSend({
					title: "",
					clientId: clientId,
					body: message,
					modelId: finalModelId,
					attachments,
					webSearchEnabled,
				});

				// Trigger HTTP streaming using Vercel AI SDK
				if (convexResult?.threadId && convexResult?.assistantMessageId) {
					// The transport will handle passing the threadId and existing message ID
					await vercelSendMessage({
						message: "", // Empty message as we're using existing assistant message
						options: {
							body: {
								modelId: finalModelId,
								webSearchEnabled,
								useExistingMessage: convexResult.assistantMessageId,
							},
						},
					});
				}

				return;
			}

			if (currentClientId && !currentThread) {
				// We have a clientId but thread doesn't exist yet
				const convexResult = await createThreadAndSend({
					title: "",
					clientId: currentClientId,
					body: message,
					modelId: finalModelId,
					attachments,
					webSearchEnabled,
				});

				// Trigger HTTP streaming using Vercel AI SDK
				if (convexResult?.threadId && convexResult?.assistantMessageId) {
					await vercelSendMessage({
						message: "", // Empty message as we're using existing assistant message
						options: {
							body: {
								modelId: finalModelId,
								webSearchEnabled,
								useExistingMessage: convexResult.assistantMessageId,
							},
						},
					});
				}

				return;
			}

			if (currentThread) {
				// Existing thread: Send message via Convex
				const convexResult = await sendMessageMutation({
					threadId: currentThread._id,
					body: message,
					modelId: finalModelId,
					attachments,
					webSearchEnabled,
				});

				// Trigger HTTP streaming using Vercel AI SDK
				if (convexResult?.messageId) {
					await vercelSendMessage({
						message: "", // Empty message as we're using existing assistant message
						options: {
							body: {
								modelId: finalModelId,
								webSearchEnabled,
								useExistingMessage: convexResult.messageId,
							},
						},
					});
				}

				return;
			}
		},
		[
			isNewChat,
			currentClientId,
			currentThread,
			modelId,
			webSearchEnabled,
			createThreadAndSend,
			sendMessageMutation,
			router,
		],
	);

	// Edit message handler (currently disabled)
	const handleEditMessage = useCallback(
		async (messageId: Id<"messages">, newContent: string) => {
			// TODO: Implement edit message functionality
			console.log("Edit message not implemented", { messageId, newContent });
		},
		[],
	);

	// Branch thread handler
	const handleBranchThread = useCallback(
		async (messageId: Id<"messages">) => {
			if (!currentThread) return null;

			const newThreadId = await branchThreadMutation({
				originalThreadId: currentThread._id,
				branchPointMessageId: messageId,
			});

			if (newThreadId) {
				router.push(`/chat/${newThreadId}`);
			}

			return newThreadId;
		},
		[currentThread, branchThreadMutation, router],
	);

	// Delete thread handler
	const handleDeleteThread = useCallback(async () => {
		if (!currentThread) return;

		await deleteThread({ threadId: currentThread._id });
		router.push("/chat");
	}, [currentThread, deleteThread, router]);

	// Clear history handler (currently disabled)
	const handleClearHistory = useCallback(async () => {
		// TODO: Implement clear history functionality
		console.log("Clear history not implemented");
		router.push("/chat");
	}, [router]);

	// Share/unshare handlers
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

		// Messages - return original Convex messages for compatibility
		messages: messages || [],
		// Also expose UI messages for components that need them
		uiMessages: mergedMessages,
		setMessages: setUIMessages,

		// User settings
		modelId,
		webSearchEnabled,
		userSettings,

		// Streaming state
		status,
		error,
		stop,

		// Actions
		sendMessage: handleSendMessage,
		regenerate,
		editMessage: handleEditMessage,
		branchThread: handleBranchThread,
		deleteThread: handleDeleteThread,
		clearHistory: handleClearHistory,
		updateThreadTitle,
		submitFeedback,
		shareThread: handleShareThread,
		unshareThread: handleUnshareThread,
		retryLastAssistant: () => console.log("Retry not implemented"),

		// References
		lastAssistantMessageId: lastAssistantMessageId.current,
	};
}
