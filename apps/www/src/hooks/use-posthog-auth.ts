"use client";

import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";
import { useAuth } from "./use-auth";

/**
 * Hook to sync authentication state with PostHog
 * Automatically identifies users when they sign in and resets on sign out
 */
export function usePostHogAuth() {
	const posthog = usePostHog();
	const { user, isAuthenticated, displayName, email, isAnonymous } = useAuth();

	useEffect(() => {
		if (!posthog) return;

		if (isAuthenticated && user) {
			// Identify the user in PostHog using clerkUserId
			posthog.identify(user.clerkUserId, {
				email: email,
				displayName: displayName,
				isAnonymous: isAnonymous,
				// createdAt is null in the new user structure
			});

			// Set user properties that persist across sessions
			posthog.people.set({
				email: email,
				displayName: displayName,
			});
		} else if (!isAuthenticated) {
			// Reset PostHog identity on sign out
			posthog.reset();
		}
	}, [posthog, isAuthenticated, user]);

	return posthog;
}
