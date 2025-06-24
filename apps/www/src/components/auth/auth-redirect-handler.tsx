"use client";

import { Authenticated } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AuthRedirectHandlerProps {
	/**
	 * Where to redirect authenticated users
	 * @default "/chat"
	 */
	redirectTo?: string;
}

/**
 * Client component that handles redirecting authenticated users
 * This runs client-side only and doesn't affect SSR of the landing page
 */
export function AuthRedirectHandler({
	redirectTo = "/chat",
}: AuthRedirectHandlerProps = {}) {
	const router = useRouter();

	return (
		<Authenticated>
			<AuthenticatedRedirect router={router} redirectTo={redirectTo} />
		</Authenticated>
	);
}

function AuthenticatedRedirect({
	router,
	redirectTo,
}: {
	router: ReturnType<typeof useRouter>;
	redirectTo: string;
}) {
	useEffect(() => {
		// Redirect authenticated users to the specified destination
		router.push(redirectTo);
	}, [router, redirectTo]);

	// Return null so it doesn't render anything
	return null;
}
