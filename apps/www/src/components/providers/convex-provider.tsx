"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { env } from "../../env";

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL, {
	verbose: true,
});

export const ConvexClientProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	return (
		<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
			{children}
		</ConvexProviderWithClerk>
	);
};
