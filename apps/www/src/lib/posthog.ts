import posthog from "posthog-js";

export const posthogClient =
	posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
		api_host: "/ingest",
		ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com",
		person_profiles: "identified_only",
		capture_pageview: false, // Disable automatic pageview capture, we'll do this manually
		capture_pageleave: true,
		// Enable debug mode in development
		debug: process.env.NODE_ENV === "development",
		// Disable in development to avoid noise
		disable_session_recording: process.env.NODE_ENV === "development",
	}) ?? posthog; // Return the existing instance if init fails
