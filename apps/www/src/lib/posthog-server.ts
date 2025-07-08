import { env } from "@/env";
import { PostHog } from "posthog-node";

// Server-side PostHog client for tracking events from API routes
export const posthogServer = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY || "", {
	host: "https://us.i.posthog.com",
	// Flush immediately in serverless environments
	flushAt: 1,
	flushInterval: 0,
});
