import { PostHog } from "posthog-node";
import { env } from "@/env";

// Server-side PostHog client for tracking events from API routes
export const posthogServer = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY || "", {
	host: "https://us.i.posthog.com",
	// Flush immediately in serverless environments
	flushAt: 1,
	flushInterval: 0,
});
