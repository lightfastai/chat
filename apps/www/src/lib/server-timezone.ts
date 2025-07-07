import { cookies } from "next/headers";
import type { TimezoneData } from "./timezone-cookies";

const TIMEZONE_COOKIE_NAME = "user-timezone";
const TIMEZONE_SOURCE_COOKIE_NAME = "user-timezone-source";
const TIMEZONE_SET_AT_COOKIE_NAME = "user-timezone-set-at";

/**
 * Get timezone data from cookies on the server side
 * This function can be called in Server Components and API routes
 */
export async function getServerTimezone(): Promise<TimezoneData | null> {
	try {
		const cookieStore = await cookies();

		const timezone = cookieStore.get(TIMEZONE_COOKIE_NAME)?.value;
		const source = cookieStore.get(TIMEZONE_SOURCE_COOKIE_NAME)?.value as
			| TimezoneData["source"]
			| undefined;
		const setAt = cookieStore.get(TIMEZONE_SET_AT_COOKIE_NAME)?.value;

		if (timezone && source && setAt) {
			return { timezone, source, setAt };
		}
		return null;
	} catch (error) {
		// Log error but don't throw - gracefully degrade
		console.warn("Failed to read timezone cookies on server:", error);
		return null;
	}
}

/**
 * Check if timezone is valid (server-side safe)
 */
export function isValidServerTimezone(timezone: string): boolean {
	try {
		// Test if timezone is valid by using it in Intl.DateTimeFormat
		new Intl.DateTimeFormat("en-US", { timeZone: timezone });
		return true;
	} catch {
		return false;
	}
}

/**
 * Calculate greeting based on timezone (server-side)
 */
export function calculateGreetingForTimezone(timezone: string): string {
	try {
		// Validate timezone first
		if (!isValidServerTimezone(timezone)) {
			return "Hello";
		}

		// Get current time in the specified timezone
		const now = new Date();
		const userTime = new Date(
			now.toLocaleString("en-US", { timeZone: timezone }),
		);
		const hour = userTime.getHours();

		if (hour < 12) {
			return "Good morning";
		}
		if (hour < 17) {
			return "Good afternoon";
		}
		return "Good evening";
	} catch (error) {
		console.warn("Failed to calculate greeting for timezone:", timezone, error);
		return "Hello";
	}
}

/**
 * Get greeting directly from server cookies (convenience function)
 */
export async function getServerGreeting(fallbackTimezone?: string): Promise<{
	greeting: string;
	timezone: string;
	source: "cookie" | "ip" | "fallback";
}> {
	// Try to get timezone from cookies first
	const cookieTimezone = await getServerTimezone();

	// Debug logging in development
	if (process.env.NODE_ENV === "development") {
		console.log("[Server Greeting] Cookie timezone:", cookieTimezone);
		console.log("[Server Greeting] IP fallback timezone:", fallbackTimezone);
	}

	if (cookieTimezone && isValidServerTimezone(cookieTimezone.timezone)) {
		const greeting = calculateGreetingForTimezone(cookieTimezone.timezone);
		if (process.env.NODE_ENV === "development") {
			console.log(
				"[Server Greeting] Using cookie timezone:",
				cookieTimezone.timezone,
				"→",
				greeting,
			);
		}
		return {
			greeting,
			timezone: cookieTimezone.timezone,
			source: "cookie",
		};
	}

	// Fall back to IP estimate if provided
	if (fallbackTimezone && isValidServerTimezone(fallbackTimezone)) {
		const greeting = calculateGreetingForTimezone(fallbackTimezone);
		if (process.env.NODE_ENV === "development") {
			console.log(
				"[Server Greeting] Using IP timezone:",
				fallbackTimezone,
				"→",
				greeting,
			);
		}
		return {
			greeting,
			timezone: fallbackTimezone,
			source: "ip",
		};
	}

	// Final fallback
	if (process.env.NODE_ENV === "development") {
		console.log("[Server Greeting] Using fallback: UTC → Hello");
	}
	return {
		greeting: "Hello",
		timezone: "UTC",
		source: "fallback",
	};
}
