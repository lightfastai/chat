"use client";

import { ThreadContextStoreProvider } from "@/components/providers/thread-context-provider";
import { useChat } from "@/hooks/use-chat";
import type { ThreadContext, ValidThread } from "@/types/schema";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { CenteredChatStart } from "./centered-chat-start";
import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";

interface ChatInterfaceProps {
	/** Chat context passed from the page */
	threadContext: ThreadContext;
	preloadedMessages?: Preloaded<typeof api.messages.listByClientId>;
	preloadedUser?: Preloaded<typeof api.users.current>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}

interface SharedChatComponentProps {
	threadContext: ValidThread;
	dbMessages: Doc<"messages">[] | undefined;
	preloadedUser?: Preloaded<typeof api.users.current>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}

function SharedChatComponent({
	threadContext,
	dbMessages,
	preloadedUser,
	preloadedUserSettings,
}: SharedChatComponentProps) {
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

function ChatInterfaceWithPreloadedQueries({
	threadContext,
	preloadedMessages,
	preloadedUser,
	preloadedUserSettings,
}: {
	threadContext: ValidThread;
	preloadedMessages?: Preloaded<typeof api.messages.listByClientId>;
	preloadedUser?: Preloaded<typeof api.users.current>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}) {
	// Extract data from preloaded queries
	const dbMessages = preloadedMessages
		? usePreloadedQuery(preloadedMessages)
		: undefined;

	return (
		<SharedChatComponent
			threadContext={threadContext}
			dbMessages={dbMessages}
			preloadedUser={preloadedUser}
			preloadedUserSettings={preloadedUserSettings}
		/>
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

	return (
		<SharedChatComponent
			threadContext={threadContext}
			dbMessages={dbMessages}
			preloadedUser={preloadedUser}
			preloadedUserSettings={preloadedUserSettings}
		/>
	);
}

export function ChatInterface({
	threadContext,
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

	// Wrap valid thread contexts with the store provider
	return (
		<ThreadContextStoreProvider initialContext={threadContext}>
			{threadContext.type === "existing" ? (
				<ChatInterfaceWithPreloadedQueries
					threadContext={threadContext}
					preloadedMessages={preloadedMessages}
					preloadedUser={preloadedUser}
					preloadedUserSettings={preloadedUserSettings}
				/>
			) : (
				<ChatInterfaceWithRegularQueries
					threadContext={threadContext}
					preloadedUser={preloadedUser}
					preloadedUserSettings={preloadedUserSettings}
				/>
			)}
		</ThreadContextStoreProvider>
	);
}
