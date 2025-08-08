"use client";

import { useAuth as useClerkAuth, useUser, useClerk } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";

/**
 * Temporary hook to provide auth actions for migration
 * This bridges Clerk auth with the existing component structure
 */
export function useAuthActions() {
	const { signOut: clerkSignOut } = useClerk();
	const router = useRouter();

	const signIn = useCallback(async (provider?: string) => {
		// Redirect to Clerk sign-in
		router.push("/sign-in");
	}, [router]);

	const signOut = useCallback(async () => {
		try {
			await clerkSignOut();
			router.push("/");
		} catch (error) {
			console.error("Error signing out:", error);
			throw error;
		}
	}, [clerkSignOut, router]);

	return { signIn, signOut };
}

/**
 * Custom hook for auth functionality
 * Now uses Clerk for authentication
 */
export function useAuth() {
	const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();
	const { user: clerkUser } = useUser();
	const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
	const currentUser = useQuery(api.users.current);
	const { signIn, signOut } = useAuthActions();

	// Use Convex auth state for compatibility during migration
	const isAuthenticated = isConvexAuthenticated;
	const isLoading = !isClerkLoaded || isConvexLoading;

	return {
		// Auth state
		isAuthenticated,
		isLoading,
		user: currentUser,

		// Auth actions
		signIn,
		signOut,

		// User info helpers (prioritize Clerk data when available)
		displayName: clerkUser?.fullName || clerkUser?.primaryEmailAddress?.emailAddress || currentUser?.name || currentUser?.email || "User",
		email: clerkUser?.primaryEmailAddress?.emailAddress || currentUser?.email,
		isAnonymous: false, // Clerk doesn't support anonymous auth
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
