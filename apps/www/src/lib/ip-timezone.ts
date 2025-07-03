import type { NextRequest } from "next/server";

/**
 * Common timezone mappings based on country/region
 * This is a simplified mapping - in production you'd use a GeoIP service
 */
const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
	// North America
	US: "America/New_York", // Default to EST, could be more specific with state data
	CA: "America/Toronto", // Default to EST, could be more specific with province data
	MX: "America/Mexico_City",

	// Europe
	GB: "Europe/London",
	FR: "Europe/Paris",
	DE: "Europe/Berlin",
	IT: "Europe/Rome",
	ES: "Europe/Madrid",
	NL: "Europe/Amsterdam",
	BE: "Europe/Brussels",
	CH: "Europe/Zurich",
	AT: "Europe/Vienna",
	SE: "Europe/Stockholm",
	NO: "Europe/Oslo",
	DK: "Europe/Copenhagen",
	FI: "Europe/Helsinki",
	PL: "Europe/Warsaw",
	CZ: "Europe/Prague",
	HU: "Europe/Budapest",
	RO: "Europe/Bucharest",
	GR: "Europe/Athens",
	PT: "Europe/Lisbon",
	IE: "Europe/Dublin",

	// Asia
	JP: "Asia/Tokyo",
	CN: "Asia/Shanghai",
	IN: "Asia/Kolkata",
	KR: "Asia/Seoul",
	SG: "Asia/Singapore",
	HK: "Asia/Hong_Kong",
	TW: "Asia/Taipei",
	TH: "Asia/Bangkok",
	ID: "Asia/Jakarta",
	MY: "Asia/Kuala_Lumpur",
	PH: "Asia/Manila",
	VN: "Asia/Ho_Chi_Minh",
	AE: "Asia/Dubai",
	IL: "Asia/Jerusalem",
	TR: "Europe/Istanbul",

	// Oceania
	AU: "Australia/Sydney", // Default to Sydney, could be more specific with state data
	NZ: "Pacific/Auckland",

	// South America
	BR: "America/Sao_Paulo",
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
};

/**
 * Extract timezone from request based on various signals
 */
export function getTimezoneFromRequest(request: NextRequest): string | null {
	try {
		// 1. Check Cloudflare headers (if using Cloudflare)
		const cfTimezone = request.headers.get("cf-timezone");
		if (cfTimezone) return cfTimezone;

		// 2. Check Vercel geo headers (if using Vercel)
		const vercelCountry = request.headers.get("x-vercel-ip-country");
		if (vercelCountry && COUNTRY_TIMEZONE_MAP[vercelCountry]) {
			return COUNTRY_TIMEZONE_MAP[vercelCountry];
		}

		// 3. Check generic geo headers
		const country =
			request.headers.get("x-country-code") ||
			request.headers.get("x-geoip-country-code");
		if (country && COUNTRY_TIMEZONE_MAP[country]) {
			return COUNTRY_TIMEZONE_MAP[country];
		}

		// 4. Parse Accept-Language header for hints
		const acceptLang = request.headers.get("accept-language");
		if (acceptLang) {
			// Extract primary language-country code (e.g., "en-US" from "en-US,en;q=0.9")
			const match = acceptLang.match(/^([a-z]{2})-([A-Z]{2})/);
			if (match && match[2] && COUNTRY_TIMEZONE_MAP[match[2]]) {
				return COUNTRY_TIMEZONE_MAP[match[2]];
			}
		}

		return null;
	} catch (error) {
		console.warn("Failed to extract timezone from request:", error);
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
