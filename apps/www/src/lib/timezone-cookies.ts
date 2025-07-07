import Cookies from "js-cookie";

const TIMEZONE_COOKIE_NAME = "user-timezone";
const TIMEZONE_SOURCE_COOKIE_NAME = "user-timezone-source";
const TIMEZONE_SET_AT_COOKIE_NAME = "user-timezone-set-at";
const COOKIE_EXPIRY_DAYS = 30; // 30 days expiry
const STALENESS_THRESHOLD_DAYS = 7; // Consider stale after 7 days

export interface TimezoneData {
	timezone: string;
	source: "browser" | "ip" | "fallback";
	setAt: string; // ISO timestamp
}

/**
 * Get timezone data from cookies
 */
export function getTimezoneCookie(): TimezoneData | null {
	try {
		const timezone = Cookies.get(TIMEZONE_COOKIE_NAME);
		const source = Cookies.get(TIMEZONE_SOURCE_COOKIE_NAME) as
			| TimezoneData["source"]
			| undefined;
		const setAt = Cookies.get(TIMEZONE_SET_AT_COOKIE_NAME);

		if (timezone && source && setAt) {
			return { timezone, source, setAt };
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Set timezone data in cookies with expiry
 */
export function setTimezoneCookie(
	timezone: string,
	source: TimezoneData["source"],
) {
	const setAt = new Date().toISOString();

	const cookieOptions = {
		expires: COOKIE_EXPIRY_DAYS,
		sameSite: "lax" as const,
		secure: process.env.NODE_ENV === "production",
		// Don't set domain to work across subdomains
	};

	Cookies.set(TIMEZONE_COOKIE_NAME, timezone, cookieOptions);
	Cookies.set(TIMEZONE_SOURCE_COOKIE_NAME, source, cookieOptions);
	Cookies.set(TIMEZONE_SET_AT_COOKIE_NAME, setAt, cookieOptions);
}

/**
 * Clear all timezone cookies
 */
export function clearTimezoneCookie() {
	Cookies.remove(TIMEZONE_COOKIE_NAME);
	Cookies.remove(TIMEZONE_SOURCE_COOKIE_NAME);
	Cookies.remove(TIMEZONE_SET_AT_COOKIE_NAME);
}

/**
 * Check if timezone cookie is stale (older than threshold)
 */
export function isTimezoneCookieStale(setAt: string): boolean {
	try {
		const cookieDate = new Date(setAt);
		const daysSince =
			(Date.now() - cookieDate.getTime()) / (1000 * 60 * 60 * 24);
		return daysSince > STALENESS_THRESHOLD_DAYS;
	} catch {
		return true; // Consider invalid dates as stale
	}
}

/**
 * Check if a timezone string is valid
 */
export function isValidTimezone(timezone: string): boolean {
	try {
		// Test if timezone is valid by using it in Intl.DateTimeFormat
		new Intl.DateTimeFormat("en-US", { timeZone: timezone });
		return true;
	} catch {
		return false;
	}
}

/**
 * Get timezone confidence level based on source and staleness
 */
export function getTimezoneConfidence(
	source: TimezoneData["source"],
	isStale: boolean,
): "high" | "medium" | "low" {
	if (source === "browser" && !isStale) return "high";
	if (source === "browser" && isStale) return "medium";
	if (source === "ip") return "medium";
	return "low";
}
