import { cache } from "react";

/**
 * Server-side cached function to get time-based greeting
 * Uses React cache to ensure consistent greeting across server and client
 */
export const getTimeGreeting = cache((): string => {
	const hour = new Date().getHours();

	if (hour < 12) {
		return "Good morning";
	}
	if (hour < 17) {
		return "Good afternoon";
	}
	return "Good evening";
});