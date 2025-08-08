"use client";

import { useConvexAuth, usePreloadedQuery, useQuery } from "convex/react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useChatPreloadContext } from "./chat-preload-context";
import { TokenUsageDialog } from "./token-usage-dialog";

export function TokenUsageHeaderWrapper() {
	// Get preloaded data from context
	const {
		preloadedThreadById,
		preloadedThreadByClientId,
		preloadedThreadUsage,
	} = useChatPreloadContext();
	const pathname = usePathname();

	// Extract current thread info from pathname with clientId support
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

		// All URIs are clientIds now
		return { type: "clientId", id };
	}, [pathname]);

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

	// Resolve client ID to actual thread ID (skip if we have preloaded data or not authenticated)
	const threadByClientId = useQuery(
		api.threads.getByClientId,
		pathInfo.type === "clientId" && !preloadedThread && isAuthenticated
			? { clientId: pathInfo.id }
			: "skip",
	);

	// Determine the actual thread ID
	const currentThreadId: Id<"threads"> | "new" = useMemo(() => {
		if (pathInfo.type === "threadId") {
			return pathInfo.id as Id<"threads">;
		}
		if (pathInfo.type === "clientId") {
			const thread = preloadedThreadByClientIdData || threadByClientId;
			if (thread) {
				return thread._id;
			}
		}
		return "new";
	}, [pathInfo, preloadedThreadByClientIdData, threadByClientId]);

	// Don't show token usage on settings page
	if (pathInfo.type === "settings") {
		return null;
	}

	return (
		<TokenUsageDialog
			threadId={currentThreadId}
			preloadedThreadUsage={preloadedThreadUsage}
		/>
	);
}
