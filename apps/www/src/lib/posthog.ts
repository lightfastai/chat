import { env } from "@/env";
import { features } from "@/lib/features";
import posthog from "posthog-js";

// Only initialize PostHog if the feature is enabled
export const posthogClient = features.posthog.enabled
	? posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY!, {
			api_host: "/ingest",
			ui_host: env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com",
			person_profiles: "identified_only",
			capture_pageview: false, // Disable automatic pageview capture, we'll do this manually
			capture_pageleave: true,
			// Enable debug mode in development
			debug: env.NODE_ENV === "development",
			// Disable in development to avoid noise
			disable_session_recording: env.NODE_ENV === "development",
		})
	: null;
