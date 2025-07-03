"use client";

import { useEffect, useState } from "react";
import {
	type TimezoneData,
	getTimezoneConfidence,
	getTimezoneCookie,
	isTimezoneCookieStale,
	isValidTimezone,
	setTimezoneCookie,
} from "./timezone-cookies";

export interface TimezoneInfo {
	timezone: string;
	source: "cookie" | "browser" | "ip" | "fallback";
	confidence: "high" | "medium" | "low";
	isStale?: boolean;
}

/**
 * Hook for smart timezone detection with cookie-based caching
 * Implements fallback chain: fresh cookie → stale cookie + browser verification → IP estimate → UTC
 */
export function useUserTimezone(
	serverTimezone?: TimezoneData | null,
	ipEstimate?: string,
): TimezoneInfo {
	const [timezoneInfo, setTimezoneInfo] = useState<TimezoneInfo>(() => {
		// Start with server cookie data if available
		if (serverTimezone && isValidTimezone(serverTimezone.timezone)) {
			const isStale = isTimezoneCookieStale(serverTimezone.setAt);
			return {
				timezone: serverTimezone.timezone,
				source: "cookie",
				confidence: getTimezoneConfidence(serverTimezone.source, isStale),
				isStale,
			};
		}

		// Fallback to IP estimate if valid
		if (ipEstimate && isValidTimezone(ipEstimate)) {
			return {
				timezone: ipEstimate,
				source: "ip",
				confidence: "medium",
			};
		}

		// Final fallback to UTC
		return {
			timezone: "UTC",
			source: "fallback",
			confidence: "low",
		};
	});

	useEffect(() => {
		let isMounted = true;

		async function detectAndUpdateTimezone() {
			try {
				// Check current cookie state on client
				const cookieData = getTimezoneCookie();

				// If we have a fresh cookie and no server data, use it
				if (cookieData && !serverTimezone) {
					const isStale = isTimezoneCookieStale(cookieData.setAt);
					const cookieTimezoneInfo = {
						timezone: cookieData.timezone,
						source: "cookie" as const,
						confidence: getTimezoneConfidence(cookieData.source, isStale),
						isStale,
					};

					if (isMounted) {
						setTimezoneInfo(cookieTimezoneInfo);
					}

					// If cookie is fresh, we're done
					if (!isStale && isValidTimezone(cookieData.timezone)) {
						return;
					}
				}

				// Always try browser detection for highest accuracy
				let browserTimezone: string | null = null;
				try {
					browserTimezone =
						Intl.DateTimeFormat().resolvedOptions().timeZone || null;
				} catch (error) {
					console.warn("Browser timezone detection failed:", error);
				}

				if (browserTimezone && isValidTimezone(browserTimezone)) {
					// Check if this is different from current timezone or if we need an update
					const needsUpdate =
						browserTimezone !== timezoneInfo.timezone ||
						timezoneInfo.source !== "browser" ||
						timezoneInfo.isStale ||
						timezoneInfo.confidence !== "high";

					if (needsUpdate && isMounted) {
						const newTimezoneInfo = {
							timezone: browserTimezone,
							source: "browser" as const,
							confidence: "high" as const,
						};

						setTimezoneInfo(newTimezoneInfo);

						// Save to cookie for future visits
						setTimezoneCookie(browserTimezone, "browser");
					}
					return;
				}

				// If browser detection fails but we have IP estimate and no good cookie
				if (
					ipEstimate &&
					isValidTimezone(ipEstimate) &&
					(!cookieData || timezoneInfo.confidence === "low")
				) {
					const ipTimezoneInfo = {
						timezone: ipEstimate,
						source: "ip" as const,
						confidence: "medium" as const,
					};

					if (isMounted) {
						setTimezoneInfo(ipTimezoneInfo);
					}

					// Save IP estimate to cookie as backup
					setTimezoneCookie(ipEstimate, "ip");
				}
			} catch (error) {
				console.warn("Timezone detection failed:", error);
				// Keep current state on error
			}
		}

		detectAndUpdateTimezone();

		return () => {
			isMounted = false;
		};
	}, [
		serverTimezone,
		ipEstimate,
		timezoneInfo.timezone,
		timezoneInfo.source,
		timezoneInfo.confidence,
		timezoneInfo.isStale,
	]);

	return timezoneInfo;
}

/**
 * Simplified hook that just returns the best available timezone string
 */
export function useTimezone(
	serverTimezone?: TimezoneData | null,
	ipEstimate?: string,
): string {
	const { timezone } = useUserTimezone(serverTimezone, ipEstimate);
	return timezone;
}
