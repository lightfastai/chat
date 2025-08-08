"use client";

import { captureException } from "@sentry/nextjs";
import { Home, RefreshCw, Settings } from "lucide-react";
import { useEffect } from "react";

import {
	type ErrorBoundaryAction,
	ErrorBoundaryUI,
} from "@/components/error/error-boundary-ui";

export default function SettingsError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log the error to console and Sentry
		console.error("Settings error boundary caught:", error);
		captureException(error);
	}, [error]);

	const isAuthError =
		error.message?.includes("unauthorized") ||
		error.message?.includes("authentication") ||
		error.message?.includes("sign in");

	const title = isAuthError ? "Authentication Required" : "Settings Error";

	const description = isAuthError
		? "You need to sign in to access your settings."
		: "We encountered an error while loading your settings. Please try again.";

	const actions = [
		!isAuthError && {
			label: "Try again",
			icon: RefreshCw,
			onClick: reset,
		},
		{
			label: "Go home",
			icon: Home,
			href: "/",
		},
		isAuthError && {
			label: "Sign in",
			href: "/sign-in",
		},
	].filter(Boolean) as ErrorBoundaryAction[];

	return (
		<ErrorBoundaryUI
			icon={Settings}
			title={title}
			description={description}
			error={error}
			actions={actions}
			className="h-[calc(100vh-4rem)]"
		/>
	);
}
