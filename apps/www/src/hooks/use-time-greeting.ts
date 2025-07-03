"use client";

import { useMemo } from "react";

export function useTimeGreeting() {
	const greeting = useMemo(() => {
		// Check if we have a cached greeting for this session
		const sessionKey = "time-greeting";
		const cachedGreeting = globalThis.sessionStorage?.getItem(sessionKey);

		if (cachedGreeting) {
			return cachedGreeting;
		}

		// Calculate new greeting based on current time
		const hour = new Date().getHours();
		let newGreeting: string;

		if (hour < 12) {
			newGreeting = "Good morning";
		} else if (hour < 17) {
			newGreeting = "Good afternoon";
		} else {
			newGreeting = "Good evening";
		}

		// Cache the greeting for this session
		try {
			globalThis.sessionStorage?.setItem(sessionKey, newGreeting);
		} catch {
			// Ignore sessionStorage errors (e.g., private browsing)
		}

		return newGreeting;
	}, []);

	return greeting;
}
