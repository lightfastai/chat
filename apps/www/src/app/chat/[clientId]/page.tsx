import { siteConfig } from "@/lib/site-config";
import { preloadQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { api } from "../../../../convex/_generated/api";
import { ChatInterface } from "../../../components/chat/chat-interface";
import { getAuthToken } from "../../../lib/auth";

export const metadata: Metadata = {
	title: "Chat Thread",
	description: "Continue your AI conversation.",
	openGraph: {
		title: `Chat Thread - ${siteConfig.name}`,
		description: "Continue your AI conversation.",
	},
	twitter: {
		title: `Chat Thread - ${siteConfig.name}`,
		description: "Continue your AI conversation.",
	},
	robots: {
		index: false,
		follow: false,
	},
};

interface ChatThreadPageProps {
	params: Promise<{
		clientId: string;
	}>;
}

// Server component for specific thread - optimized for SSR and instant navigation
export default async function ChatThreadPage({ params }: ChatThreadPageProps) {
	// Await params in Next.js 15
	const { clientId } = await params;

	// Validate clientId format - basic check to prevent obvious invalid IDs
	// Also exclude reserved routes
	const reservedRoutes = ["settings", "new"];
	const isReservedRoute =
		reservedRoutes.includes(clientId) || clientId.startsWith("settings/");
	if (!clientId || clientId.length < 10 || isReservedRoute) {
		notFound();
	}

	return (
		<Suspense fallback={<ChatInterface />}>
			<ChatThreadPageWithPreloadedData />
		</Suspense>
	);
}

// Server component that handles data preloading with PPR optimization
async function ChatThreadPageWithPreloadedData() {
	try {
		// Get authentication token for server-side requests
		const token = await getAuthToken();

		// If no authentication token, render regular chat interface
		if (!token) {
			return <ChatInterface />;
		}

		// Preload user settings
		const preloadedUserSettings = await preloadQuery(
			api.userSettings.getUserSettings,
			{},
			{ token },
		);

		return <ChatInterface preloadedUserSettings={preloadedUserSettings} />;
	} catch (error) {
		// Log error but still render - don't break the UI
		console.warn("Server-side chat data preload failed:", error);

		// Fallback to regular chat interface
		return <ChatInterface />;
	}
}
