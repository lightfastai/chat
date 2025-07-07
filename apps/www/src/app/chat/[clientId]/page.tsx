import { siteConfig } from "@/lib/site-config";
import type { Metadata } from "next";
import { ChatInterface } from "../../../components/chat/chat-interface";

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

// Simple server component ready for PPR
export default function ChatThreadPage() {
	// Validation is handled by middleware, so we can trust the clientId here
	return <ChatInterface />;
}
