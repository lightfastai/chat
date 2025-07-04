"use client";

import { useChat } from "@/hooks/use-chat";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { convertDbMessagesToUIMessages } from "../../hooks/convertDbMessagesToUIMessages";
import { CenteredChatStart } from "./centered-chat-start";
import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Doc } from "../../../convex/_generated/dataModel";

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
	const pathname = usePathname();

	const pathInfo = useMemo(() => {
		if (pathname === "/chat") {
			return { type: "new", id: "new" };
		}

		const match = pathname.match(/^\/chat\/(.+)$/);
		if (!match) {
			return { type: "new", id: "new" };
		}

		const id = match[1];

		// Handle special routes
		if (id === "settings" || id.startsWith("settings/")) {
			return { type: "settings", id: "settings" };
		}

		// Assume it's a client-generated ID for now
		return { type: "clientId", id };
	}, [pathname]);

	const currentClientId = pathInfo.type === "clientId" ? pathInfo.id : null;

	let dbMessages: Doc<"messages">[] = [];
	if (preloadedMessages) {
		dbMessages = usePreloadedQuery(preloadedMessages);
	}

	if (!preloadedMessages) {
		dbMessages =
			useQuery(
				api.messages.listByClientId,
				currentClientId ? { clientId: currentClientId } : "skip",
			) || [];
	}

	// Let useChat determine everything from the current pathname
	const { messages, sendMessage, status } = useChat({
		initialMessages: convertDbMessagesToUIMessages(dbMessages),
		preloadedUserSettings,
		clientId: currentClientId,
	});

	// Show centered layout only for new chats with no messages
	if (pathInfo.type === "new" && dbMessages.length === 0) {
		return (
			<CenteredChatStart
				onSendMessage={sendMessage}
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
				dbMessages={dbMessages}
			/>
		</div>
	);
}
