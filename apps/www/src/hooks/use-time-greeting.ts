"use client";

import { useState, useEffect } from "react";
import { useUserTimezone } from "@/lib/use-user-timezone";
import type { TimezoneData } from "@/lib/timezone-cookies";

export interface GreetingInfo {
	greeting: string;
	timezone: string;
	confidence: "high" | "medium" | "low";
	source: "cookie" | "browser" | "ip" | "fallback";
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
	const [greeting, setGreeting] = useState("Welcome"); // Safe default

	useEffect(() => {
		try {
			// Calculate greeting in user's timezone
			const now = new Date();
			const userTime = new Date(
				now.toLocaleString("en-US", { timeZone: timezone }),
			);
			const hour = userTime.getHours();

			let newGreeting: string;
			if (hour < 12) {
				newGreeting = "Good morning";
			} else if (hour < 17) {
				newGreeting = "Good afternoon";
			} else {
				newGreeting = "Good evening";
			}

			setGreeting(newGreeting);
		} catch (error) {
			console.warn("Timezone calculation failed:", error);
			// Fallback to simple greeting
			setGreeting("Hello");
		}
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