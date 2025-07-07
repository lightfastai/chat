import { siteConfig } from "@/lib/site-config";
import type { Metadata } from "next";
import { ChatInterface } from "../../components/chat/chat-interface";

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

// Simple server component ready for PPR
export default function ChatPage() {
	return <ChatInterface />;
}
