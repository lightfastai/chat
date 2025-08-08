"use client";

import { useAuth } from "@clerk/nextjs";
import { Skeleton } from "@lightfast/ui/components/ui/skeleton";
import {
	AuthLoading,
	Authenticated,
	ConvexReactClient,
	Unauthenticated,
} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
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

// Export a wrapper that waits for auth to be ready
export const ConvexAuthWrapper = ({ children }: { children: ReactNode }) => {
	return (
		<>
			<AuthLoading>
				<div className="flex h-screen w-full items-center justify-center">
					<div className="flex flex-col items-center gap-4">
						<Skeleton className="h-8 w-8 rounded-full" />
						<Skeleton className="h-4 w-32" />
					</div>
				</div>
			</AuthLoading>
			<Authenticated>{children}</Authenticated>
			<Unauthenticated>{children}</Unauthenticated>
		</>
	);
};
