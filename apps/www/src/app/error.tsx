"use client";

import { captureException } from "@sentry/nextjs";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { ErrorBoundaryUI } from "@/components/error/error-boundary-ui";

export default function ErrorBoundary({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log the error to console and Sentry
		console.error("App error boundary caught:", error);
		captureException(error);
	}, [error]);

	return (
		<ErrorBoundaryUI
			icon={AlertCircle}
			title="Something went wrong"
			description="We encountered an unexpected error. The issue has been logged and we'll look into it."
			error={error}
			actions={[
				{
					label: "Try again",
					icon: RefreshCw,
					onClick: reset,
				},
				{
					label: "Go home",
					icon: Home,
					href: "/",
				},
			]}
			className="h-[calc(100vh-4rem)]"
		/>
	);
}
