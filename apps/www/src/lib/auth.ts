"use server";

import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";

/**
 * Get the current user's information on the server side
 * This can be used in Server Components and Server Actions
 */
export async function getCurrentUser() {
	try {
		const token = await convexAuthNextjsToken();
		if (!token) {
			return null;
		}

		const user = await fetchQuery(api.users.current, {}, { token });
		return user;
	} catch (error) {
		console.error("Error getting current user:", error);
		return null;
	}
}

/**
 * Check if the user is authenticated on the server side
 * This can be used in middleware, Server Components, and Server Actions
 */
export async function isAuthenticated(): Promise<boolean> {
	try {
		const token = await convexAuthNextjsToken();
		return !!token;
	} catch (error) {
		console.error("Error checking authentication:", error);
		return false;
	}
}

/**
 * Helper to get the authentication token for server-side Convex calls
 */
export async function getAuthToken() {
	try {
		return await convexAuthNextjsToken();
	} catch (error) {
		console.error("Error getting auth token:", error);
		return null;
	}
}
