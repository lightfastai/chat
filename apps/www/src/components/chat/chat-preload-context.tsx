"use client";

import type { Preloaded } from "convex/react";
import { createContext, useContext } from "react";
import type { api } from "../../../convex/_generated/api";

interface ChatPreloadContextValue {
	preloadedThreadById?: Preloaded<typeof api.threads.get>;
	preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>;
	preloadedThreadUsage?: Preloaded<typeof api.messages.getThreadUsage>;
	preloadedMessages?: Preloaded<typeof api.messages.listByClientId>;
}

const ChatPreloadContext = createContext<ChatPreloadContextValue>({});

interface ChatPreloadProviderProps {
	children: React.ReactNode;
	preloadedThreadById?: Preloaded<typeof api.threads.get>;
	preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>;
	preloadedThreadUsage?: Preloaded<typeof api.messages.getThreadUsage>;
	preloadedMessages?: Preloaded<typeof api.messages.listByClientId>;
}

export function ChatPreloadProvider({
	children,
	preloadedThreadById,
	preloadedThreadByClientId,
	preloadedThreadUsage,
	preloadedMessages,
}: ChatPreloadProviderProps) {
	return (
		<ChatPreloadContext.Provider
			value={{
				preloadedThreadById,
				preloadedThreadByClientId,
				preloadedThreadUsage,
				preloadedMessages,
			}}
		>
			{children}
		</ChatPreloadContext.Provider>
	);
}

export function useChatPreloadContext() {
	return useContext(ChatPreloadContext);
}
