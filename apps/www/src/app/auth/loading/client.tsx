"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

interface AuthLoadingClientProps {
	provider?: string;
	redirectTo?: string;
}

export function AuthLoadingClient({
	provider: _provider,
	redirectTo = "/chat",
}: AuthLoadingClientProps) {
	const router = useRouter();
	const hasInitiated = useRef(false);

	useEffect(() => {
		// Prevent double execution
		if (hasInitiated.current) return;
		hasInitiated.current = true;

		// With Clerk, authentication is handled through their UI
		// This loading page is no longer needed - redirect to sign-in
		const url = new URL("/sign-in", window.location.origin);
		url.searchParams.set("redirect_url", redirectTo);
		router.push(url.toString());
	}, [redirectTo, router]);

	// This component is hidden - all UI is handled by the server component
	return null;
}