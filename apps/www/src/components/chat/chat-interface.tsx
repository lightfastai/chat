"use client";

import { useChat } from "@/hooks/use-chat";
import type { ThreadContext, ValidThread } from "@/types/schema";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import { CenteredChatStart } from "./centered-chat-start";
import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";

interface ChatInterfaceProps {
	/** Chat context passed from the page */
	threadContext: ThreadContext;
	preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>;
	preloadedMessages?: Preloaded<typeof api.messages.listByClientId>;
	preloadedUser?: Preloaded<typeof api.users.current>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}

export function ChatInterface({
	threadContext,
	preloadedThreadByClientId,
	preloadedMessages,
	preloadedUser,
	preloadedUserSettings,
}: ChatInterfaceProps) {
	// Extract thread from preloaded query if available
	const thread = preloadedThreadByClientId
		? usePreloadedQuery(preloadedThreadByClientId)
		: undefined;

	// Extract database messages from preloaded query if available and thread is resolved
	const databaseMessages =
		preloadedMessages && thread?._id
			? usePreloadedQuery(preloadedMessages)
			: undefined;

	const { messages, sendMessage, status, canSendMessage } = useChat({
		threadContext: threadContext as ValidThread, // @note: quick hack,
		preloadedThreadByClientId,
		preloadedMessages,
		preloadedUserSettings,
	});

	// Show centered layout only for new chats with no messages
	if (threadContext.type === "new" && messages.length === 0) {
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
			<ChatMessages
				messages={messages}
				databaseMessages={databaseMessages}
				status={status}
			/>
			<ChatInput
				onSendMessage={sendMessage}
				disabled={!canSendMessage}
				status={status}
			/>
		</div>
	);
}
