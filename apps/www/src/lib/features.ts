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
   * Default mode is 'github' if AUTH_MODE is not set
   * GitHub OAuth requires GitHub credentials (AUTH_GITHUB_ID and AUTH_GITHUB_SECRET)
   * Password and Google OAuth are future-ready
   */
  auth: {
    mode: (env.AUTH_MODE || AUTH_MODES.GITHUB) as AuthMode,
    providers: {
      password: env.AUTH_MODE === AUTH_MODES.PASSWORD,
      github: (!env.AUTH_MODE || env.AUTH_MODE === AUTH_MODES.GITHUB) && !!env.AUTH_GITHUB_ID && !!env.AUTH_GITHUB_SECRET,
      google: env.AUTH_MODE === AUTH_MODES.GOOGLE && !!env.AUTH_GOOGLE_ID && !!env.AUTH_GOOGLE_SECRET,
    },
  },
} as const;

// Type-safe helper functions for feature flag checks
export type FeatureKey = keyof typeof features;
export type EnabledFeatureKey = {
  [K in FeatureKey]: "enabled" extends keyof typeof features[K] ? K : never;
}[FeatureKey];

export const isFeatureEnabled = <T extends EnabledFeatureKey>(
  feature: T
): boolean => {
  const featureConfig = features[feature] as { enabled: boolean };
  return featureConfig.enabled;
};

export const getAuthMode = (): AuthMode => features.auth.mode;

export const isAuthModeEnabled = (mode: AuthMode): boolean => {
  return features.auth.providers[mode] ?? false;
};

// Track feature usage for analytics
export const trackFeatureUsage = (feature: string, enabled: boolean) => {
  if (features.posthog.enabled && typeof window !== "undefined") {
    // This will be available in components that use PostHog
    (window as any).posthog?.capture?.("feature_flag_evaluated", {
      feature,
      enabled,
      environment: env.NODE_ENV,
      timestamp: Date.now(),
    });
  }
};

// Development helpers and debugging tools
export const getFeatureStatus = () => {
  if (env.NODE_ENV === "production") {
    return null;
  }

  const enabledFeatures = Object.entries(features)
    .filter(([_, config]) => 
      typeof config === "object" && 
      "enabled" in config && 
      config.enabled
    )
    .map(([name]) => name);

  return {
    sentry: features.sentry.enabled ? "enabled" : "disabled",
    posthog: features.posthog.enabled ? "enabled" : "disabled",
    authMode: features.auth.mode,
    authProviders: Object.entries(features.auth.providers)
      .filter(([_, enabled]) => enabled)
      .map(([provider]) => provider),
    enabledFeatures,
    totalFlags: Object.keys(features).length,
    environment: env.NODE_ENV,
  };
};

// Development-only feature override (client-side only)
export const getDevFeatureOverrides = (): Record<string, boolean> => {
  if (env.NODE_ENV === "production" || typeof window === "undefined") {
    return {};
  }
  
  try {
    const overrides = localStorage.getItem("dev-feature-overrides");
    return overrides ? JSON.parse(overrides) : {};
  } catch {
    return {};
  }
};

export const setDevFeatureOverride = (feature: string, enabled: boolean) => {
  if (env.NODE_ENV === "production" || typeof window === "undefined") {
    return;
  }
  
  const overrides = getDevFeatureOverrides();
  overrides[feature] = enabled;
  localStorage.setItem("dev-feature-overrides", JSON.stringify(overrides));
  console.log(`Dev override set: ${feature} = ${enabled}`);
};