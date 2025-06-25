"use client";

import { useChat } from "@/hooks/use-chat";
import type { Preloaded } from "convex/react";
import { useEffect, useMemo, useRef } from "react";
import type { api } from "../../../convex/_generated/api";
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
	const { messages, currentThread, handleSendMessage, isDisabled, isNewChat } =
		useChat({
			preloadedThreadById,
			preloadedThreadByClientId,
			preloadedMessages,
			preloadedUserSettings,
		});

	// Track if user has ever sent a message to prevent flicker
	const hasEverSentMessage = useRef(false);

	// Reset when we're in a truly new chat, set when messages exist
	useEffect(() => {
		if (isNewChat && messages.length === 0) {
			hasEverSentMessage.current = false;
		} else if (messages.length > 0) {
			hasEverSentMessage.current = true;
		}
	}, [isNewChat, messages.length]);

	// Check if AI is currently generating (any message is streaming or thread is generating)
	const isAIGenerating = useMemo(() => {
		// For new chats, only check if there are active messages streaming
		// Don't check currentThread?.isGenerating to avoid carrying over state from previous threads
		if (isNewChat) {
			return messages.some((msg) => msg.isStreaming && !msg.isComplete);
		}

		// For existing chats, check all conditions
		return (
			currentThread?.isGenerating ||
			messages.some((msg) => msg.isStreaming && !msg.isComplete)
		);
	}, [currentThread, messages, isNewChat]);

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
			<ChatMessages messages={messages} />
			<ChatInput
				onSendMessage={handleSendMessage}
				placeholder="Message AI assistant..."
				disabled={isDisabled}
				isLoading={isAIGenerating}
			/>
		</div>
	);
}
