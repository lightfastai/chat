"use client";

import { useChat } from "@/hooks/use-chat";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { convertDbMessagesToUIMessages } from "../../hooks/convertDbMessagesToUIMessages";
import { CenteredChatStart } from "./centered-chat-start";
import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";

interface ChatInterfaceProps {
	preloadedMessages?: Preloaded<typeof api.messages.listByClientId>;
	preloadedUser?: Preloaded<typeof api.users.current>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}


export function ChatInterface({
	preloadedMessages,
	preloadedUser,
	preloadedUserSettings,
}: ChatInterfaceProps) {
	// Let useChat determine everything from the current pathname
	const { messages, sendMessage, status, canSendMessage, isNewChat } = useChat({
		initialMessages: preloadedMessages ? convertDbMessagesToUIMessages(usePreloadedQuery(preloadedMessages)) : [],
		preloadedUserSettings,
	});

	// Show centered layout only for new chats with no messages
	if (isNewChat && messages.length === 0) {
		return (
			<CenteredChatStart
				onSendMessage={sendMessage}
				disabled={!canSendMessage}
				dbMessages={preloadedMessages ? usePreloadedQuery(preloadedMessages) : undefined}
				preloadedUser={preloadedUser}
			/>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<ChatMessages
				dbMessages={preloadedMessages ? usePreloadedQuery(preloadedMessages) : undefined}
				vercelMessages={messages}
				status={status}
			/>
			<ChatInput
				onSendMessage={sendMessage}
				disabled={!canSendMessage}
				dbMessages={preloadedMessages ? usePreloadedQuery(preloadedMessages) : undefined}
			/>
		</div>
	);
}
