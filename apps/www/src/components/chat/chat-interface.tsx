"use client";

import type { Preloaded } from "convex/react";
import { useQuery } from "convex/react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import { convertDbMessagesToUIMessages } from "../../hooks/convertDbMessagesToUIMessages";
import { useChat } from "../../hooks/use-chat";
import { CenteredChatStart } from "./centered-chat-start";
import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";

interface ChatInterfaceProps {
	preloadedUser?: Preloaded<typeof api.users.current>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}

export function ChatInterface({
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

	const dbMessages = useQuery(
		api.messages.listByClientId,
		currentClientId ? { clientId: currentClientId } : "skip",
	);

	const { messages, sendMessage } = useChat({
		initialMessages: convertDbMessagesToUIMessages(dbMessages || []),
		preloadedUserSettings,
		clientId: currentClientId,
	});

	// Show centered layout only for new chats with no messages
	if (pathInfo.type === "new" && !dbMessages) {
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
			<ChatMessages dbMessages={dbMessages} vercelMessages={messages} />
			<ChatInput onSendMessage={sendMessage} dbMessages={dbMessages} />
		</div>
	);
}
