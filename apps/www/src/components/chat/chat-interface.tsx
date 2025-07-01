"use client";

import { useChat } from "@/hooks/use-chat";
import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import { CenteredChatStart } from "./centered-chat-start";
import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";

interface ChatInterfaceProps {
	preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>;
	preloadedMessages?: Preloaded<typeof api.messages.listByClientId>;
	preloadedUser?: Preloaded<typeof api.users.current>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
	fallbackChatId?: string;
}

export function ChatInterface({
	preloadedThreadByClientId,
	preloadedMessages,
	preloadedUser,
	preloadedUserSettings,
	fallbackChatId,
}: ChatInterfaceProps) {
	const { messages, isNewChat, sendMessage, status, canSendMessage, chatId } = useChat({
		preloadedThreadByClientId,
		preloadedMessages,
		preloadedUserSettings,
		fallbackChatId,
	});

	// Show centered layout only for new chats with no messages
	if (isNewChat && messages.length === 0) {
		return (
			<CenteredChatStart
				onSendMessage={sendMessage}
				disabled={!canSendMessage}
				status={status}
				preloadedUser={preloadedUser}
			/>
		);
	}

	return (
		<div className="flex flex-col h-full ">
			<ChatMessages key={chatId || "default"} messages={messages} status={status} />
			<ChatInput
				onSendMessage={sendMessage}
				disabled={!canSendMessage}
				status={status}
			/>
		</div>
	);
}
