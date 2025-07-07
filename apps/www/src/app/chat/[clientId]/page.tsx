import { siteConfig } from "@/lib/site-config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

interface ChatThreadPageProps {
	params: Promise<{
		clientId: string;
	}>;
}

// Simple server component ready for PPR
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

	return <ChatInterface />;
}
