/**
 * Clerk authentication configuration for Convex
 * This file configures Clerk as the authentication provider for Convex
 */
import { env } from "./env";

export default {
	providers: [
		{
			// The issuer domain from your Clerk JWT template
			// This should match the Issuer URL from your Clerk dashboard JWT template
			domain: env.CLERK_JWT_ISSUER_DOMAIN,
			// Must be exactly "convex" as configured in Clerk dashboard JWT template
			applicationID: "convex",
		},
	],
};
