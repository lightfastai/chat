import { env } from "@/env";
import { features } from "@/lib/features";
import { PostHog } from "posthog-node";

// Server-side PostHog client for tracking events from API routes
// Only initialize if PostHog is enabled
export const posthogServer = features.posthog.enabled
	? new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY!, {
			host: "https://us.i.posthog.com",
			// Flush immediately in serverless environments
			flushAt: 1,
			flushInterval: 0,
		})
	: null;
