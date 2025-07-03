"use client";

import { useChat } from "@/hooks/use-chat";
import type { ThreadContext } from "@/types/schema";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { convertDbMessagesToUIMessages } from "../../hooks/convertDbMessagesToUIMessages";
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
	clientId: string | null;
	dbMessages: Doc<"messages">[] | undefined;
	preloadedUser?: Preloaded<typeof api.users.current>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}

function SharedChatComponent({
	clientId,
	dbMessages,
	preloadedUser,
	preloadedUserSettings,
}: SharedChatComponentProps) {
	const { messages, sendMessage, status, canSendMessage, isNewChat } = useChat({
		clientId,
		initialMessages: convertDbMessagesToUIMessages(dbMessages || []),
		preloadedUserSettings,
	});

	// Show centered layout only for new chats with no messages
	if (isNewChat && (!dbMessages || dbMessages.length === 0)) {
		return (
			<CenteredChatStart
				onSendMessage={sendMessage}
				disabled={!canSendMessage}
				dbMessages={dbMessages}
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
				dbMessages={dbMessages}
			/>
		</div>
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

	// Extract clientId from context
	const clientId =
		threadContext.type === "new" || threadContext.type === "existing"
			? threadContext.clientId
			: null;

	// Get messages - use preloaded if available, otherwise query
	let dbMessages: Doc<"messages">[] | undefined;

	if (threadContext.type === "existing" && preloadedMessages) {
		dbMessages = usePreloadedQuery(preloadedMessages);
	} else if (clientId) {
		dbMessages = useQuery(api.messages.listByClientId, { clientId });
	}

	return (
		<SharedChatComponent
			clientId={clientId}
			dbMessages={dbMessages}
			preloadedUser={preloadedUser}
			preloadedUserSettings={preloadedUserSettings}
		/>
	);
}
