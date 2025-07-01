import { SharedChatView } from "@/components/chat/shared-chat-view";
import { siteConfig } from "@/lib/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Shared Chat",
	description: "View a shared AI chat conversation.",
	openGraph: {
		title: `Shared Chat - ${siteConfig.name}`,
		description: "View a shared AI chat conversation.",
	},
	twitter: {
		title: `Shared Chat - ${siteConfig.name}`,
		description: "View a shared AI chat conversation.",
	},
	robots: {
		index: false,
		follow: false,
	},
};

export default function SharePage({
	params,
}: {
	params: { shareId: string };
}) {
	return <SharedChatView shareId={params.shareId} />;
}
