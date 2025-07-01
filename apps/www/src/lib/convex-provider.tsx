"use client";

import { PostHogAuthSync } from "@/components/providers/posthog-auth-sync";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { env } from "../env";

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL, {
	verbose: true,
});

export const ConvexClientProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	return (
		<ConvexAuthNextjsProvider client={convex}>
			<PostHogAuthSync>{children}</PostHogAuthSync>
		</ConvexAuthNextjsProvider>
	);
};
