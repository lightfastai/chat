import { customAlphabet } from "nanoid";

// Custom nanoid with lowercase alphanumeric only for clean URLs
// Length 21 gives us ~149 years to have 1% probability of collision at 1000 IDs/hour
export const nanoid = customAlphabet(
	"0123456789abcdefghijklmnopqrstuvwxyz",
	21,
);

// Helper function to check if an ID is a client-generated nanoid
export function isClientId(id: string): boolean {
	// Check if it's exactly 21 chars with our custom alphabet (lowercase alphanumeric only)
	// Convex IDs typically have different patterns (mixed case, different length, different chars)
	return /^[0-9a-z]{21}$/.test(id);
}

// Helper function to check if an ID looks like a Convex ID
export function isConvexId(id: string): boolean {
	// Convex IDs are typically base64-like strings
	// They can contain uppercase, lowercase, numbers, and sometimes underscores or hyphens
	// They're usually not exactly 21 chars (our client ID length) or 32 chars
	// This is a heuristic check
	if (!id || id.length < 10 || id.length > 50) return false;

	// If it's a client ID, it's not a Convex ID
	if (isClientId(id)) return false;

	// Check if it contains characters typical of Convex IDs
	// Allow alphanumeric, underscore, and hyphen
	return /^[a-zA-Z0-9_-]+$/.test(id);
}
