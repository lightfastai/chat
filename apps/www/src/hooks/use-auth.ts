"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useCallback } from "react";
import { api } from "../../convex/_generated/api";

/**
 * Custom hook for auth functionality
 * Provides a unified interface for authentication operations
 */
export function useAuth() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const { signIn, signOut } = useAuthActions();
	const currentUser = useQuery(api.users.current);

	const handleSignIn = useCallback(
		async (provider: "github" = "github") => {
			try {
				await signIn(provider);
			} catch (error) {
				console.error("Error signing in:", error);
				throw error;
			}
		},
		[signIn],
	);

	const handleSignOut = useCallback(async () => {
		try {
			await signOut();
		} catch (error) {
			console.error("Error signing out:", error);
			throw error;
		}
	}, [signOut]);

	return {
		// Auth state
		isAuthenticated,
		isLoading,
		user: currentUser,

		// Auth actions
		signIn: handleSignIn,
		signOut: handleSignOut,

		// User info helpers
		displayName: currentUser?.name || currentUser?.email || "User",
		email: currentUser?.email,
		isAnonymous: currentUser?.isAnonymous || false,
		createdAt: currentUser?._creationTime
			? new Date(currentUser._creationTime)
			: null,
	};
}

/**
 * Hook specifically for getting current user data
 * Returns null when not authenticated
 */
export function useCurrentUser() {
	const { isAuthenticated } = useConvexAuth();
	const currentUser = useQuery(api.users.current);

	return isAuthenticated ? currentUser : null;
}

/**
 * Hook for auth state only (no user data)
 * Useful when you only need to know if user is authenticated
 */
export function useAuthState() {
	const { isAuthenticated, isLoading } = useConvexAuth();

	return {
		isAuthenticated,
		isLoading,
		isUnauthenticated: !isAuthenticated && !isLoading,
	};
}
