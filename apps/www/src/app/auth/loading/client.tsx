"use client";

import { useAuth } from "@clerk/nextjs";
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
	const { isSignedIn, isLoaded } = useAuth();
	const hasInitiated = useRef(false);

	useEffect(() => {
		// Prevent double execution
		if (hasInitiated.current || !isLoaded) return;
		hasInitiated.current = true;

		// If user is already signed in, redirect to the intended destination
		if (isSignedIn) {
			router.push(redirectTo);
		} else {
			// If not signed in, redirect to sign-in page with redirect_url param
			const url = new URL("/sign-in", window.location.origin);
			url.searchParams.set("redirect_url", redirectTo);
			router.push(url.toString());
		}
	}, [redirectTo, router, isSignedIn, isLoaded]);

	// This component is hidden - all UI is handled by the server component
	return null;
}

