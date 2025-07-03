"use client";

import { posthogClient } from "@/lib/posthog";
import { usePathname, useSearchParams } from "next/navigation";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { Suspense, useEffect } from "react";

function PostHogPageView() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useEffect(() => {
		if (pathname) {
			const url = window.origin + pathname;
			const fullUrl = searchParams?.toString()
				? `${url}?${searchParams.toString()}`
				: url;

			posthogClient.capture("$pageview", {
				$current_url: fullUrl,
			});
		}
	}, [pathname, searchParams]);

	return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	return (
		<PHProvider client={posthogClient}>
			<Suspense fallback={null}>
				<PostHogPageView />
			</Suspense>
			{children}
		</PHProvider>
	);
}
