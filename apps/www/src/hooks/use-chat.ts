"use client";

import { env } from "@/env";
import type { ModelId } from "@/lib/ai";
import { convexMessagesToUIMessages } from "@/lib/ai/message-converters";
import { isClientId, nanoid } from "@/lib/nanoid";
import { useChat as useVercelChat } from "@ai-sdk/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { DefaultChatTransport } from "ai";
import {
	type Preloaded,
	useMutation,
	usePreloadedQuery,
	useQuery,
} from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// Types for the transport request body
interface ChatTransportBody {
	modelId?: string;
	webSearchEnabled?: boolean;
	attachments?: Id<"files">[];
}

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
	// Convex IDs typically start with 'k' and have a specific length
	const isOptimisticThreadId =
		messageThreadId &&
		(!messageThreadId.startsWith("k") || messageThreadId.length < 25);

	console.log("[useChat] Message loading debug:", {
		messageThreadId,
		isOptimisticThreadId,
		hasPreloadedMessages: !!options.preloadedMessages,
		currentThreadId: currentThread?._id,
	});

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

	console.log("[useChat] Messages result:", {
		hasPreloadedMessages: !!preloadedMessages,
		hasConvexMessages: !!convexMessages,
		messagesLength: messages?.length,
		messages: messages,
	});

	// Get user settings
	const userSettings = options.preloadedUserSettings
		? usePreloadedQuery(options.preloadedUserSettings)
		: useQuery(api.userSettings.getUserSettings);

	const modelId =
		userSettings?.preferences?.defaultModel || ("gpt-4o-mini" as ModelId);
	const webSearchEnabled = false; // TODO: Add web search preference to user settings

	// Mutations (only keep the ones we still need)
	const createThread = useMutation(api.threads.create);
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
	const streamUrl = `${convexSiteUrl}/stream-chat`;

	// Convert preloaded Convex messages to format expected by Vercel AI SDK
	const initialMessages = useMemo(() => {
		console.log(
			"[useChat] useMemo initialMessages running, messages:",
			messages,
		);
		if (!messages || messages.length === 0) {
			console.log("[useChat] No messages to convert");
			return [];
		}

		console.log(
			"[useChat] Converting initial messages from database:",
			messages,
		);

		// Use the proper converter function which handles all type compatibility
		const converted = convexMessagesToUIMessages(messages);

		console.log("[useChat] Converted messages:", converted);
		console.log(
			"[useChat] First converted message parts:",
			converted[0]?.parts,
		);
		return converted;
	}, [messages]);

	// Create transport with request transformation
	const transport = useMemo(() => {
		if (!authToken) return undefined;

		return new DefaultChatTransport({
			api: streamUrl,
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
			prepareSendMessagesRequest: ({
				id,
				messages,
				body,
				headers,
				credentials,
				api,
				trigger,
			}) => {
				// Type the body parameter properly
				const typedBody = body as ChatTransportBody | undefined;

				// Transform the request to match Convex HTTP streaming format
				const convexBody = {
					// For new chats or clientIds, send null threadId
					// If it's a clientId, send it separately so the backend can look up the thread
					threadId: id === "new" || isClientId(id) ? null : id,
					clientId: isClientId(id) ? id : undefined,
					modelId: typedBody?.modelId || modelId,
					messages: messages, // Send UIMessages directly
					options: {
						webSearchEnabled: typedBody?.webSearchEnabled ?? webSearchEnabled,
						trigger, // Pass through the trigger type
						// Additional options that might be needed
						attachments: typedBody?.attachments,
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
	}, [streamUrl, authToken, modelId]);

	// Pre-generate clientId for new chats to ensure consistent ID throughout the request
	const preGeneratedClientId = useMemo(() => {
		return isNewChat ? nanoid() : null;
	}, [isNewChat]);

	// Determine the chat ID - use thread ID when available, otherwise use clientId
	// IMPORTANT: For existing threads, we should use the thread ID to ensure messages are loaded
	const chatId =
		currentThread?._id || currentClientId || preGeneratedClientId || "new";

	console.log("[useChat] Before useVercelChat:", {
		chatId,
		hasTransport: !!transport,
		initialMessagesLength: initialMessages.length,
		initialMessages,
	});

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
		id: chatId,
		transport,
		// Don't use initialMessages - it's buggy in v5
		generateId: () => nanoid(), // Use our nanoid for consistency
		onFinish: async ({ message }) => {
			// Track the assistant message ID
			if (message.role === "assistant") {
				lastAssistantMessageId.current = message.id as Id<"messages">;
			}
		},
	});

	// Workaround for Vercel AI SDK v5 initialMessages bug
	// Use setMessages in useEffect to load initial messages
	useEffect(() => {
		if (
			initialMessages &&
			initialMessages.length > 0 &&
			!isNewChat // Don't interfere with completely new chats
		) {
			// Case 1: No UI messages at all - set all initial messages
			if (uiMessages.length === 0) {
				console.log(
					"[useChat] Setting initial messages via useEffect:",
					initialMessages,
				);
				setUIMessages(initialMessages);
			}
			// Case 2: UI messages exist but some have empty parts - merge with database content
			// Be very careful not to override streaming state
			else if (status !== "streaming") {
				const needsUpdate = uiMessages.some((uiMsg) => {
					const dbMsg = initialMessages.find(
						(initMsg) => initMsg.id === uiMsg.id,
					);
					// Only update if database has content and UI message is empty
					return (
						dbMsg &&
						dbMsg.parts.length > 0 &&
						uiMsg.parts.length === 0 &&
						uiMsg.role === "assistant"
					); // Only update assistant messages
				});

				if (needsUpdate) {
					console.log("[useChat] Updating messages with database content");
					// Instead of replacing all messages, merge the content more carefully
					const updatedMessages = uiMessages.map((uiMsg) => {
						const dbMsg = initialMessages.find(
							(initMsg) => initMsg.id === uiMsg.id,
						);
						if (dbMsg && dbMsg.parts.length > 0 && uiMsg.parts.length === 0) {
							return {
								...uiMsg,
								parts: dbMsg.parts,
								metadata: {
									...(uiMsg.metadata || {}),
									...(dbMsg.metadata || {}),
									status: "ready", // Mark as ready when loading from DB
								},
							};
						}
						return uiMsg;
					});
					setUIMessages(updatedMessages);
				}
			}
		}
	}, [initialMessages, setUIMessages, uiMessages, status, isNewChat]);

	// Additional useEffect to handle new chat transition
	// When a thread gets created during streaming, we need to load messages from DB
	useEffect(() => {
		if (
			currentClientId && // We're in a clientId-based URL
			currentThread && // Thread has been created/found
			initialMessages && 
			initialMessages.length > 0 &&
			uiMessages.length === 0 && // But no UI messages loaded yet
			status !== "streaming" // And not currently streaming
		) {
			console.log(
				"[useChat] Loading messages for newly created thread from clientId:",
				{
					clientId: currentClientId,
					threadId: currentThread._id,
					messagesCount: initialMessages.length,
				}
			);
			setUIMessages(initialMessages);
		}
	}, [currentClientId, currentThread, initialMessages, uiMessages.length, status, setUIMessages]);

	// Single source of truth: Just use Vercel AI SDK messages
	// This is the simplest and most reliable approach
	const enhancedMessages = uiMessages;

	// Debug logging
	console.log("[useChat] uiMessages from Vercel SDK:", uiMessages);
	console.log("[useChat] streaming status:", status);
	console.log("[useChat] chatId:", chatId);
	console.log("[useChat] currentThread:", currentThread);
	console.log("[useChat] isNewChat:", isNewChat);

	// Debug streaming messages
	if (uiMessages.length > 0) {
		const lastMessage = uiMessages[uiMessages.length - 1];
		const metadata = lastMessage.metadata as any;
		console.log("[useChat] Last message state:", {
			id: lastMessage.id,
			role: lastMessage.role,
			status: status,
			partsLength: lastMessage.parts?.length,
			hasText: lastMessage.parts?.some((p) => p.type === "text"),
			isStreaming: metadata?.isStreaming,
			isComplete: metadata?.isComplete,
			textContent:
				lastMessage.parts?.find((p) => p.type === "text")?.text?.slice(0, 50) +
				"...",
		});
	}

	// Custom send message handler - creates thread first if needed
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
			const finalModelId = messageModelId || modelId;

			// For new chats, create thread first then update URL
			if (isNewChat && preGeneratedClientId) {
				// Create thread with pre-generated clientId for instant navigation
				// Pass the first user message for title generation
				createThread({
					title: "",
					clientId: preGeneratedClientId,
					firstUserMessage: message, // Pass user message for title generation
				});
				// Navigate to clientId immediately for optimistic update
				router.replace(`/chat/${preGeneratedClientId}`);
			}

			// Let Vercel AI SDK handle everything through the transport
			await vercelSendMessage(
				{
					role: "user",
					parts: [{ type: "text", text: message }],
				},
				{
					body: {
						modelId: finalModelId,
						attachments,
						webSearchEnabled,
					},
				},
			);
		},
		[
			isNewChat,
			preGeneratedClientId,
			modelId,
			vercelSendMessage,
			router,
			createThread,
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
				branchFromMessageId: messageId,
				modelId: modelId,
			});

			if (newThreadId) {
				router.push(`/chat/${newThreadId}`);
			}

			return newThreadId;
		},
		[currentThread, branchThreadMutation, router, modelId],
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
		// Enhanced messages with smart streaming/database transition
		uiMessages: enhancedMessages,
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
