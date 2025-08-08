"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTimeGreeting } from "@/hooks/use-time-greeting";
import type { TimezoneData } from "@/lib/timezone-cookies";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import { ChatBadge } from "./chat-badge";

interface ChatEmptyStateProps {
	preloadedUser?: Preloaded<typeof api.users.current>;
	serverTimezone?: TimezoneData | null;
	ipEstimate?: string;
	serverGreeting?: {
		greeting: string;
		timezone: string;
		source: "cookie" | "ip" | "fallback";
	};
}

export function ChatEmptyState({
	preloadedUser,
	serverTimezone,
	ipEstimate,
	serverGreeting,
}: ChatEmptyStateProps) {
	const { displayName, email } = useAuth();
	// Use server greeting if available to avoid client-side bounce
	const clientGreetingInfo = useTimeGreeting(serverTimezone, ipEstimate);
	const greeting = serverGreeting?.greeting || clientGreetingInfo.greeting;

	// Use preloaded user data if available, otherwise fall back to regular auth hook
	const preloadedUserData = preloadedUser
		? usePreloadedQuery(preloadedUser)
		: null;

	const userEmail =
		preloadedUserData?.email || email || displayName || "there";

	return (
		<div className="mb-6 px-3">
			<ChatBadge />
			<p className="text-2xl">
				{greeting}, {userEmail}
			</p>
		</div>
	);
}