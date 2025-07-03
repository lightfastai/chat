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
	const { user, isAuthenticated } = useAuth();

	useEffect(() => {
		if (!posthog) return;

		if (isAuthenticated && user) {
			// Identify the user in PostHog
			posthog.identify(user._id, {
				email: user.email,
				name: user.name,
				isAnonymous: user.isAnonymous,
				createdAt: user._creationTime,
			});

			// Set user properties that persist across sessions
			posthog.people.set({
				email: user.email,
				name: user.name,
			});
		} else if (!isAuthenticated) {
			// Reset PostHog identity on sign out
			posthog.reset();
		}
	}, [posthog, isAuthenticated, user]);

	return posthog;
}
