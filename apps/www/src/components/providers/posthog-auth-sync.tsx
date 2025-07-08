"use client";

import { usePostHogAuth } from "@/hooks/use-posthog-auth";

/**
 * Component that syncs authentication state with PostHog
 * Should be placed inside ConvexAuthProvider to have access to auth state
 */
export function PostHogAuthSync({ children }: { children: React.ReactNode }) {
	// This hook handles all the PostHog user identification logic
	usePostHogAuth();

	return <>{children}</>;
}
