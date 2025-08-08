/**
 * Clerk authentication configuration for Convex
 * This file configures Clerk as the authentication provider for Convex
 */

export default {
	providers: [
		{
			// The issuer domain from your Clerk JWT template
			// This should match the Issuer URL from your Clerk dashboard JWT template
			domain: "https://clerk.lightfast.ai",
			// Must be exactly "convex" as configured in Clerk dashboard JWT template
			applicationID: "convex",
		},
	],
};
