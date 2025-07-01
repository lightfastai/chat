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
