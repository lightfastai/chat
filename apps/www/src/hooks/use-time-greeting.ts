"use client";

import type { TimezoneData } from "@/lib/timezone-cookies";
import { useUserTimezone } from "@/lib/use-user-timezone";
import { useEffect, useState } from "react";

export interface GreetingInfo {
	greeting: string;
	timezone: string;
	confidence: "high" | "medium" | "low";
	source: "cookie" | "browser" | "ip" | "fallback";
}

/**
 * Calculate greeting based on timezone (pure function)
 */
function calculateGreeting(timezone: string): string {
	try {
		// Calculate greeting in user's timezone
		const now = new Date();
		const userTime = new Date(
			now.toLocaleString("en-US", { timeZone: timezone }),
		);
		const hour = userTime.getHours();

		if (hour < 12) {
			return "Good morning";
		} else if (hour < 17) {
			return "Good afternoon";
		} else {
			return "Good evening";
		}
	} catch (error) {
		console.warn("Timezone calculation failed:", error);
		// Fallback to simple greeting
		return "Hello";
	}
}

/**
 * Hook for getting time-based greeting using accurate user timezone from cookies
 */
export function useTimeGreeting(
	serverTimezone?: TimezoneData | null,
	ipEstimate?: string,
): GreetingInfo {
	const { timezone, confidence, source } = useUserTimezone(
		serverTimezone,
		ipEstimate,
	);

	// Calculate greeting immediately based on current timezone
	// This prevents the "Welcome" -> actual greeting bounce
	const [greeting, setGreeting] = useState(() => calculateGreeting(timezone));

	useEffect(() => {
		// Update greeting when timezone changes
		const newGreeting = calculateGreeting(timezone);
		setGreeting(newGreeting);
	}, [timezone]);

	return {
		greeting,
		timezone,
		confidence,
		source,
	};
}

/**
 * Simple hook that just returns the greeting string
 */
export function useGreeting(
	serverTimezone?: TimezoneData | null,
	ipEstimate?: string,
): string {
	const { greeting } = useTimeGreeting(serverTimezone, ipEstimate);
	return greeting;
}
