"use client";

import { env } from "@/env";
import { useChat } from "@ai-sdk/react";
import { useAuthToken } from "@convex-dev/auth/react";
import type { ModelId } from "@/lib/ai";
import { isClientId, nanoid } from "@/lib/nanoid";
import type { Preloaded } from "convex/react";
import { usePathname } from "next/navigation";
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
	preloadedMessages: _preloadedMessages, // Not used in simplified architecture
	preloadedUser,
	preloadedUserSettings,
}: ChatInterfaceProps = {}) {
	const pathname = usePathname();

	// Extract thread/client ID from URL and preloaded data
	const threadById = preloadedThreadById ? (preloadedThreadById as any) : null;
	const threadByClientId = preloadedThreadByClientId
		? (preloadedThreadByClientId as any)
		: null;
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

	// Extract user settings safely
	const userSettings = preloadedUserSettings
		? (preloadedUserSettings as any)
		: null;
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

	// Use Vercel AI SDK as primary UI message source
	const {
		messages: uiMessages,
		status,
		input,
		setInput,
		sendMessage: vercelSendMessage,
		stop,
		error,
	} = useChat({
		id: threadId || clientId || "new-chat",
		api: streamUrl,
		headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
		body: {
			threadId,
			clientId,
			modelId: defaultModel,
			webSearchEnabled: false,
		},
		onError: (error) => {
			console.error("Chat error:", error);
		},
	});

	// Computed values for compatibility
	const isEmpty = uiMessages.length === 0;
	const totalMessages = uiMessages.length;
	const isStreaming = status === "in_progress";
	const canSendMessage = !isStreaming && !!authToken;

	// Determine if this is a new chat
	const isNewChat = isEmpty;

	// Adapt sendMessage to use Vercel AI SDK v5 sendMessage function
	const handleSendMessage = useCallback(
		async (
			message: string,
			selectedModelId: string,
			attachments?: Id<"files">[],
			_webSearchEnabledOverride?: boolean,
		) => {
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
		},
		[vercelSendMessage, threadId, clientId],
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
			<ChatMessages messages={uiMessages} isLoading={isAIGenerating} />
			<ChatInput
				onSendMessage={handleSendMessage}
				disabled={isDisabled}
				isLoading={isAIGenerating}
			/>
		</div>
	);
}
