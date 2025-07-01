import { env } from "@/env";

/**
 * Feature flag configuration for the application
 *
 * This system provides centralized control over opt-in features:
 * - Sentry error tracking (enabled when NEXT_PUBLIC_SENTRY_DSN is provided)
 * - PostHog analytics (enabled when NEXT_PUBLIC_POSTHOG_KEY is provided)
 * - Authentication modes (controlled by AUTH_MODE environment variable)
 */

// Authentication modes supported by the application
export const AUTH_MODES = {
	PASSWORD: "password",
	GITHUB: "github",
	GOOGLE: "google", // Future support
} as const;

export type AuthMode = (typeof AUTH_MODES)[keyof typeof AUTH_MODES];

// Type-safe feature flag configuration
export const features = {
	/**
	 * Sentry error tracking and monitoring
	 * Only enabled when NEXT_PUBLIC_SENTRY_DSN is provided
	 */
	sentry: {
		enabled: !!env.NEXT_PUBLIC_SENTRY_DSN,
		dsn: env.NEXT_PUBLIC_SENTRY_DSN,
		environment: env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
	},

	/**
	 * PostHog product analytics
	 * Only enabled when NEXT_PUBLIC_POSTHOG_KEY is provided
	 */
	posthog: {
		enabled: !!env.NEXT_PUBLIC_POSTHOG_KEY,
		key: env.NEXT_PUBLIC_POSTHOG_KEY,
		host: env.NEXT_PUBLIC_POSTHOG_HOST,
	},

	/**
	 * Authentication configuration
	 * Default mode is 'password' if AUTH_MODE is not set
	 * GitHub OAuth requires both AUTH_MODE='github' and GitHub credentials
	 * Google OAuth is future-ready
	 */
	auth: {
		mode: (env.AUTH_MODE || AUTH_MODES.PASSWORD) as AuthMode,
		providers: {
			password: !env.AUTH_MODE || env.AUTH_MODE === AUTH_MODES.PASSWORD,
			github:
				env.AUTH_MODE === AUTH_MODES.GITHUB &&
				!!env.AUTH_GITHUB_ID &&
				!!env.AUTH_GITHUB_SECRET,
			google:
				env.AUTH_MODE === AUTH_MODES.GOOGLE &&
				!!env.AUTH_GOOGLE_ID &&
				!!env.AUTH_GOOGLE_SECRET,
		},
	},
} as const;

// Helper functions for feature flag checks
export const isFeatureEnabled = (feature: keyof typeof features): boolean => {
	const featureConfig = features[feature];
	return "enabled" in featureConfig ? featureConfig.enabled : false;
};

export const getAuthMode = (): AuthMode => features.auth.mode;

export const isAuthModeEnabled = (mode: AuthMode): boolean => {
	return features.auth.providers[mode] ?? false;
};

// Development helpers
export const getFeatureStatus = () => {
	if (env.NODE_ENV === "production") {
		return null;
	}

	return {
		sentry: features.sentry.enabled ? "enabled" : "disabled",
		posthog: features.posthog.enabled ? "enabled" : "disabled",
		authMode: features.auth.mode,
		authProviders: Object.entries(features.auth.providers)
			.filter(([_, enabled]) => enabled)
			.map(([provider]) => provider),
	};
};
