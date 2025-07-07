import type { NextRequest } from "next/server";

/**
 * Map of country codes to their primary timezones
 * This covers the most common cases - for complete accuracy, use a geolocation API
 */
const countryToTimezone: Record<string, string> = {
	// North America - Use central timezones for better average
	US: "America/Chicago", // Central timezone - better average for US users
	CA: "America/Toronto", // Most populous timezone in Canada
	MX: "America/Mexico_City",

	// Europe
	GB: "Europe/London",
	DE: "Europe/Berlin",
	FR: "Europe/Paris",
	IT: "Europe/Rome",
	ES: "Europe/Madrid",
	NL: "Europe/Amsterdam",
	BE: "Europe/Brussels",
	CH: "Europe/Zurich",
	AT: "Europe/Vienna",
	PL: "Europe/Warsaw",
	SE: "Europe/Stockholm",
	NO: "Europe/Oslo",
	DK: "Europe/Copenhagen",
	FI: "Europe/Helsinki",
	GR: "Europe/Athens",
	PT: "Europe/Lisbon",
	IE: "Europe/Dublin",
	CZ: "Europe/Prague",
	HU: "Europe/Budapest",
	RO: "Europe/Bucharest",

	// Asia
	JP: "Asia/Tokyo",
	CN: "Asia/Shanghai",
	IN: "Asia/Kolkata",
	KR: "Asia/Seoul",
	TW: "Asia/Taipei",
	HK: "Asia/Hong_Kong",
	SG: "Asia/Singapore",
	MY: "Asia/Kuala_Lumpur",
	TH: "Asia/Bangkok",
	ID: "Asia/Jakarta",
	VN: "Asia/Ho_Chi_Minh",
	PH: "Asia/Manila",
	PK: "Asia/Karachi",
	BD: "Asia/Dhaka",
	TR: "Europe/Istanbul",
	SA: "Asia/Riyadh",
	AE: "Asia/Dubai",
	IL: "Asia/Jerusalem",

	// Oceania
	AU: "Australia/Sydney", // Most populous timezone in Australia
	NZ: "Pacific/Auckland",

	// South America
	BR: "America/Sao_Paulo", // Most populous timezone in Brazil
	AR: "America/Argentina/Buenos_Aires",
	CL: "America/Santiago",
	CO: "America/Bogota",
	PE: "America/Lima",
	VE: "America/Caracas",

	// Africa
	ZA: "Africa/Johannesburg",
	EG: "Africa/Cairo",
	NG: "Africa/Lagos",
	KE: "Africa/Nairobi",
	MA: "Africa/Casablanca",

	// Russia (default to Moscow)
	RU: "Europe/Moscow",
};

/**
 * Map of US states/regions to timezones for better accuracy
 */
const usRegionToTimezone: Record<string, string> = {
	// Eastern Time
	NY: "America/New_York",
	FL: "America/New_York",
	PA: "America/New_York",
	OH: "America/New_York",
	GA: "America/New_York",
	NC: "America/New_York",
	VA: "America/New_York",
	MA: "America/New_York",
	NJ: "America/New_York",
	CT: "America/New_York",
	MD: "America/New_York",
	SC: "America/New_York",
	// Central Time
	TX: "America/Chicago",
	IL: "America/Chicago",
	WI: "America/Chicago",
	MO: "America/Chicago",
	MN: "America/Chicago",
	LA: "America/Chicago",
	IA: "America/Chicago",
	OK: "America/Chicago",
	KS: "America/Chicago",
	// Mountain Time
	CO: "America/Denver",
	AZ: "America/Phoenix", // No DST
	UT: "America/Denver",
	NM: "America/Denver",
	// Pacific Time
	CA: "America/Los_Angeles",
	WA: "America/Los_Angeles",
	OR: "America/Los_Angeles",
	NV: "America/Los_Angeles",
};

/**
 * Get timezone from request headers using various methods
 */
export function getTimezoneFromRequest(request: NextRequest): string | null {
	try {
		// 1. Check Cloudflare headers (if using Cloudflare)
		const cfTimezone = request.headers.get("cf-timezone");
		if (cfTimezone) {
			return cfTimezone;
		}

		// 2. Check for x-vercel-ip-timezone (Vercel's header)
		const vercelTimezone = request.headers.get("x-vercel-ip-timezone");
		if (vercelTimezone) {
			return vercelTimezone;
		}

		// 3. Try to get country and region for better US timezone detection
		const country =
			request.headers.get("x-vercel-ip-country") ||
			request.headers.get("cf-ipcountry") ||
			request.headers.get("x-country-code");

		// For US, check region for more accurate timezone
		if (country === "US") {
			const region = request.headers.get("x-vercel-ip-country-region");
			if (region && usRegionToTimezone[region]) {
				return usRegionToTimezone[region];
			}
		}

		if (country && countryToTimezone[country]) {
			return countryToTimezone[country];
		}

		// 4. Fallback to Accept-Language header parsing
		const acceptLanguage = request.headers.get("accept-language");
		if (acceptLanguage) {
			// Extract country from language tags like "en-US", "fr-FR"
			const match = acceptLanguage.match(/[a-z]{2}-([A-Z]{2})/);
			if (match && match[1] && countryToTimezone[match[1]]) {
				return countryToTimezone[match[1]];
			}
		}

		// 5. Default fallback
		return null;
	} catch (error) {
		console.warn("Failed to detect timezone from request:", error);
		return null;
	}
}

/**
 * Validate if a timezone string is valid
 */
export function isValidTimezone(timezone: string): boolean {
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: timezone });
		return true;
	} catch {
		return false;
	}
}
