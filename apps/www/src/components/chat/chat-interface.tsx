"use client";

import { useSimplifiedChat } from "@/hooks/use-simplified-chat";
import type { ModelId } from "@/lib/ai";
import { isClientId } from "@/lib/nanoid";
import type { Preloaded } from "convex/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
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
	const clientId = (() => {
		if (pathname === "/chat") return null;
		const match = pathname.match(/^\/chat\/(.+)$/);
		if (!match) return null;
		const id = match[1];
		return isClientId(id) ? id : null;
	})();

	// Extract user settings safely
	const userSettings = preloadedUserSettings
		? (preloadedUserSettings as any)
		: null;
	const defaultModel = userSettings?.preferences?.defaultModel || "gpt-4o-mini";

	// Use simplified chat hook - much cleaner than the old useChat
	const {
		messages,
		thread: currentThread,
		sendMessage: simplifiedSendMessage,
		canSendMessage,
		isStreaming,
		isEmpty,
		totalMessages,
	} = useSimplifiedChat({
		threadId,
		clientId,
		modelId: defaultModel,
		webSearchEnabled: false,
	});

	// Convert Convex messages to UIMessage format for compatibility with existing components
	const uiMessages = useMemo(() => {
		return messages.map((messageWithStatus) => {
			const { message } = messageWithStatus;

			// Convert parts to be compatible with UIMessage format
			const compatibleParts = (message.parts || []).map((part: any) => {
				if (part.type === "source") {
					// Convert source parts to source-document format for UIMessage compatibility
					return {
						...part,
						type: "source-document",
					};
				}
				return part;
			});

			return {
				id: message._id,
				role: message.messageType as "user" | "assistant" | "system",
				parts: compatibleParts,
				createdAt: new Date(message.timestamp),
				metadata: {
					model: message.model,
					modelId: message.modelId,
					timestamp: message.timestamp,
					usage: message.usage,
					status: message.status,
				},
			} as any; // Type assertion for compatibility
		});
	}, [messages]);

	// Determine if this is a new chat (same logic as before)
	const isNewChat = !threadId && !currentThread && isEmpty;

	// Debug: Log messages in ChatInterface
	console.log("[ChatInterface] uiMessages:", uiMessages);
	console.log("[ChatInterface] uiMessages length:", uiMessages.length);
	console.log("[ChatInterface] currentThread:", currentThread);
	console.log("[ChatInterface] isNewChat:", isNewChat);

	// Adapt sendMessage to match the expected onSendMessage signature
	const handleSendMessage = useCallback(
		async (
			message: string,
			selectedModelId: string,
			attachments?: Id<"files">[],
			_webSearchEnabledOverride?: boolean,
		) => {
			await simplifiedSendMessage({
				text: message,
				modelId: selectedModelId as ModelId,
				attachments,
			});
		},
		[simplifiedSendMessage],
	);

	// Determine if chat is disabled (using new simplified state)
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

	// Check if AI is currently generating (using new simplified state)
	const isAIGenerating = useMemo(() => {
		return currentThread?.isGenerating || isStreaming;
	}, [currentThread?.isGenerating, isStreaming]);

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
