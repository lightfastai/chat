import { siteConfig } from "@/lib/site-config";
import { preloadQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { api } from "../../../convex/_generated/api";
import { ChatInterface } from "../../components/chat/chat-interface";
import { getAuthToken } from "../../lib/auth";
import { nanoid } from "../../lib/nanoid";
import type { ThreadContext } from "../../types/schema";

// Force dynamic rendering to ensure new clientId generation on each navigation
// This prevents the production caching issue where old thread context persists
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
	return <ChatPageWithPreloadedData />;
}

// Server component that handles data preloading with PPR optimization
async function ChatPageWithPreloadedData() {
	try {
		// Get authentication token for server-side requests
		const token = await getAuthToken();

		// If no authentication token, render regular chat interface
		if (!token) {
			const threadContext: ThreadContext = {
				type: "error",
			};

			return <ChatInterface threadContext={threadContext} />;
		}

		// Generate a stable ID for new chats on the server side
		const threadContext: ThreadContext = {
			clientId: nanoid(),
			type: "new",
		};

		// Preload user data and settings for PPR - this will be cached and streamed instantly
		const [preloadedUser, preloadedUserSettings] = await Promise.all([
			preloadQuery(api.users.current, {}, { token }),
			preloadQuery(api.userSettings.getUserSettings, {}, { token }),
		]);

		// Pass preloaded user data and settings to chat interface
		return (
			<ChatInterface
				preloadedUser={preloadedUser}
				preloadedUserSettings={preloadedUserSettings}
				threadContext={threadContext}
			/>
		);
	} catch (error) {
		// Log error but still render - don't break the UI
		console.warn("Server-side user preload failed:", error);

		const threadContext: ThreadContext = {
			type: "error",
		};

		// Fallback to regular chat interface
		return <ChatInterface threadContext={threadContext} />;
	}
}
