"use client";

import { useChat } from "@/hooks/use-chat";
import type { Preloaded } from "convex/react";
import React from "react";
import type { api } from "../../../convex/_generated/api";
import { CenteredChatStart } from "./centered-chat-start";
import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";

interface ChatInterfaceProps {
	preloadedThreadById?: Preloaded<typeof api.threads.get>;
	preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>;
	preloadedMessages?: Preloaded<typeof api.messages.listByClientId>;
	preloadedUser?: Preloaded<typeof api.users.current>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}

export function ChatInterface({
	preloadedThreadByClientId,
	preloadedMessages,
	preloadedUser,
	preloadedUserSettings,
}: ChatInterfaceProps = {}) {
	const { messages, isNewChat, sendMessage, status, canSendMessage } = useChat({
		preloadedThreadByClientId,
		preloadedMessages,
		preloadedUserSettings,
	});

	// Show centered layout only for new chats with no messages
	if (isNewChat && messages.length === 0) {
		return (
			<CenteredChatStart
				onSendMessage={sendMessage}
				disabled={!canSendMessage}
				isLoading={status === "streaming"}
				preloadedUser={preloadedUser}
			/>
		);
	}

	return (
		<div className="flex flex-col h-full ">
			<ChatMessages messages={messages} isLoading={status === "streaming"} />
			<ChatInput
				onSendMessage={sendMessage}
				disabled={!canSendMessage}
				isLoading={status === "streaming"}
			/>
		</div>
	);
}
