"use client";

import { useChat } from "@/hooks/use-chat";
import type { ThreadContext, ValidThread } from "@/types/schema";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
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

function ChatInterfaceWithPreloadedQueries({
	threadContext,
	preloadedThreadByClientId,
	preloadedMessages,
	preloadedUser,
	preloadedUserSettings,
}: {
	threadContext: ValidThread;
	preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>;
	preloadedMessages?: Preloaded<typeof api.messages.listByClientId>;
	preloadedUser?: Preloaded<typeof api.users.current>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}) {
	// Extract data from preloaded queries
	const thread = preloadedThreadByClientId
		? usePreloadedQuery(preloadedThreadByClientId)
		: undefined;

	const dbMessages =
		preloadedMessages && thread?._id
			? usePreloadedQuery(preloadedMessages)
			: undefined;

	const { messages, sendMessage, status, canSendMessage } = useChat({
		threadContext,
		dbMessages,
		preloadedUserSettings,
	});

	// Show centered layout only for new chats with no messages
	if (
		threadContext.type === "new" &&
		(!dbMessages || dbMessages.length === 0) &&
		messages.length === 0
	) {
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
		<div className="flex flex-col h-full">
			<ChatMessages
				dbMessages={dbMessages}
				vercelMessages={messages}
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

function ChatInterfaceWithRegularQueries({
	threadContext,
	preloadedUser,
	preloadedUserSettings,
}: {
	threadContext: ValidThread;
	preloadedUser?: Preloaded<typeof api.users.current>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}) {
	// Use regular queries for non-existing threads
	const dbMessages = useQuery(api.messages.listByClientId, {
		clientId: threadContext.clientId,
	});

	const { messages, sendMessage, status, canSendMessage } = useChat({
		threadContext,
		dbMessages,
		preloadedUserSettings,
	});

	// Show centered layout only for new chats with no messages
	if (
		threadContext.type === "new" &&
		(!dbMessages || dbMessages.length === 0) &&
		messages.length === 0
	) {
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
		<div className="flex flex-col h-full">
			<ChatMessages
				dbMessages={dbMessages}
				vercelMessages={messages}
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

export function ChatInterface({
	threadContext,
	preloadedThreadByClientId,
	preloadedMessages,
	preloadedUser,
	preloadedUserSettings,
}: ChatInterfaceProps) {
	// Handle error state
	if (threadContext.type === "error") {
		return (
			<div className="flex flex-col h-full items-center justify-center">
				<div className="text-center">
					<h2 className="text-lg font-semibold text-foreground mb-2">
						Unable to load chat
					</h2>
					<p className="text-sm text-muted-foreground">
						Please try refreshing the page or starting a new chat.
					</p>
				</div>
			</div>
		);
	}

	// Handle fallback/loading state
	if (threadContext.type === "fallback") {
		return null;
	}

	// Handle existing threads with preloaded queries
	if (threadContext.type === "existing") {
		return (
			<ChatInterfaceWithPreloadedQueries
				threadContext={threadContext}
				preloadedThreadByClientId={preloadedThreadByClientId}
				preloadedMessages={preloadedMessages}
				preloadedUser={preloadedUser}
				preloadedUserSettings={preloadedUserSettings}
			/>
		);
	}

	// Handle new threads with regular queries
	if (threadContext.type === "new") {
		return (
			<ChatInterfaceWithRegularQueries
				threadContext={threadContext}
				preloadedUser={preloadedUser}
				preloadedUserSettings={preloadedUserSettings}
			/>
		);
	}

	// TypeScript exhaustiveness check - should never reach here
	const _exhaustive: never = threadContext;
	return _exhaustive;
}
