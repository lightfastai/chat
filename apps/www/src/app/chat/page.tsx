import { getServerGreeting, getServerTimezone } from "@/lib/server-timezone";
import { siteConfig } from "@/lib/site-config";
import { preloadQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { api } from "../../../convex/_generated/api";
import { ChatInterface } from "../../components/chat/chat-interface";
import { getAuthToken } from "../../lib/auth";

export const metadata: Metadata = {
	title: "New Chat",
	description:
		"Start intelligent conversations with AI agents using Lightfast.",
	openGraph: {
		title: `New Chat - ${siteConfig.name}`,
		description:
			"Start intelligent conversations with AI agents using Lightfast.",
		url: `${siteConfig.url}/chat`,
	},
	twitter: {
		title: `New Chat - ${siteConfig.name}`,
		description:
			"Start intelligent conversations with AI agents using Lightfast.",
	},
	robots: {
		index: false,
		follow: false,
	},
};

// Server component that enables SSR for the new chat page with prefetched user data
export default function ChatPage() {
	return (
		<Suspense fallback={<ChatInterface />}>
			<ChatPageWithPreloadedData />
		</Suspense>
	);
}

// Server component that handles data preloading with PPR optimization
async function ChatPageWithPreloadedData() {
	try {
		// Get authentication token for server-side requests
		const token = await getAuthToken();

		// Get timezone from cookies (server-side)
		const serverTimezone = await getServerTimezone();

		// Get IP estimate from middleware
		const headersList = await headers();
		const ipEstimate = headersList.get("x-user-timezone") || undefined;

		// Calculate server-side greeting to avoid client-side bounce
		const serverGreeting = await getServerGreeting(ipEstimate);

		// If no authentication token, render regular chat interface with timezone data
		if (!token) {
			return (
				<ChatInterface
					serverTimezone={serverTimezone}
					ipEstimate={ipEstimate}
					serverGreeting={serverGreeting}
				/>
			);
		}

		// Preload user data and settings for PPR - this will be cached and streamed instantly
		const [preloadedUser, preloadedUserSettings] = await Promise.all([
			preloadQuery(api.users.current, {}, { token }),
			preloadQuery(api.userSettings.getUserSettings, {}, { token }),
		]);

		// Pass preloaded user data, settings, and timezone data to chat interface
		return (
			<ChatInterface
				preloadedUser={preloadedUser}
				preloadedUserSettings={preloadedUserSettings}
				serverTimezone={serverTimezone}
				ipEstimate={ipEstimate}
				serverGreeting={serverGreeting}
			/>
		);
	} catch (error) {
		// Log error but still render - don't break the UI
		console.warn("Server-side user preload failed:", error);

		// Get timezone data for fallback case
		const serverTimezone = await getServerTimezone();
		const headersList = await headers();
		const ipEstimate = headersList.get("x-user-timezone") || undefined;
		const serverGreeting = await getServerGreeting(ipEstimate);

		// Fallback to regular chat interface with timezone data
		return (
			<ChatInterface
				serverTimezone={serverTimezone}
				ipEstimate={ipEstimate}
				serverGreeting={serverGreeting}
			/>
		);
	}
}
