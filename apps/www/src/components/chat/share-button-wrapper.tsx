"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexAuth, usePreloadedQuery, useQuery } from "convex/react";
import { usePathname } from "next/navigation";
import { useChatPreloadContext } from "./chat-preload-context";
import { ShareButton } from "./share-button";

export function ShareButtonWrapper() {
	// Get preloaded data from context
	const { preloadedThreadById, preloadedThreadByClientId, preloadedMessages } =
		useChatPreloadContext();
	const pathname = usePathname();

	// Extract clientId from pathname since useParams() doesn't update with window.history.replaceState()
	const clientId = pathname.startsWith("/chat/")
		? pathname.slice(6) // Remove "/chat/" prefix
		: undefined;

	// Check if this is a new chat (no thread ID in URL)
	const isNewChat = pathname === "/chat";

	// Handle special routes
	const isSettingsPage =
		clientId === "settings" || clientId?.startsWith("settings/");

	// Use preloaded thread data if available
	const preloadedThreadByIdData = preloadedThreadById
		? usePreloadedQuery(preloadedThreadById)
		: null;

	const preloadedThreadByClientIdData = preloadedThreadByClientId
		? usePreloadedQuery(preloadedThreadByClientId)
		: null;

	const preloadedThread =
		preloadedThreadByIdData || preloadedThreadByClientIdData;

	// Check authentication status
	const { isAuthenticated } = useConvexAuth();

	// Get thread by clientId if needed (skip for settings, if preloaded, or if not authenticated)
	const threadByClientId = useQuery(
		api.threads.getByClientId,
		clientId && !isSettingsPage && !preloadedThread && isAuthenticated
			? { clientId }
			: "skip",
	);

	// Determine the actual Convex thread ID
	let threadId: Id<"threads"> | undefined;
	const currentThread = preloadedThread || threadByClientId;
	if (currentThread) {
		threadId = currentThread._id;
	}

	// Get messages to check if there's actual content
	const preloadedMessagesData = preloadedMessages
		? usePreloadedQuery(preloadedMessages)
		: null;

	// Query messages by clientId if we have one (skip for new chat)
	const messagesByClientId = useQuery(
		api.messages.listByClientId,
		clientId && !preloadedMessagesData && !isNewChat && isAuthenticated
			? { clientId }
			: "skip",
	);

	// Don't show share button on settings page
	if (isSettingsPage) {
		return null;
	}

	// Get actual messages
	const messages = preloadedMessagesData ?? messagesByClientId ?? [];

	// Check if there are any messages to share
	const hasShareableContent = messages.length > 0;

	// Don't show share button if there's no content to share
	if (!hasShareableContent) {
		return null;
	}

	return <ShareButton threadId={threadId} hasContent={hasShareableContent} />;
}
