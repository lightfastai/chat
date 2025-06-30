"use client";

import { useChat } from "@/hooks/use-chat";
import type { ModelId } from "@/lib/ai";
import type { Preloaded } from "convex/react";
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
	preloadedMessages,
	preloadedUser,
	preloadedUserSettings,
}: ChatInterfaceProps = {}) {
	// Use custom chat hook with optimistic updates and preloaded data
	const { uiMessages, currentThread, sendMessage, isNewChat } = useChat({
		preloadedThreadById,
		preloadedThreadByClientId,
		preloadedMessages,
		preloadedUserSettings,
	});

	// Debug: Log uiMessages in ChatInterface
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
			await sendMessage({
				message,
				modelId: selectedModelId as ModelId,
				attachments,
				// Note: webSearchEnabled is handled by the hook internally
			});
		},
		[sendMessage],
	);

	// Determine if chat is disabled
	// For now, let's just check thread state
	const isDisabled = currentThread?.isGenerating || false;

	// Track if user has ever sent a message to prevent flicker
	const hasEverSentMessage = useRef(false);

	// Reset when we're in a truly new chat, set when messages exist
	useEffect(() => {
		if (isNewChat && uiMessages.length === 0) {
			hasEverSentMessage.current = false;
		} else if (uiMessages.length > 0) {
			hasEverSentMessage.current = true;
		}
	}, [isNewChat, uiMessages.length]);

	// Check if AI is currently generating
	const isAIGenerating = useMemo(() => {
		// For existing chats, check thread state
		return currentThread?.isGenerating || false;
	}, [currentThread]);

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
