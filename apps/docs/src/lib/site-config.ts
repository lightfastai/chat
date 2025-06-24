import type { SiteConfig } from "@repo/ui/types/site";

type SiteLinks = "twitter" | "github" | "discord" | "chat" | "home";

export const siteConfig: SiteConfig<SiteLinks> = {
	name: "Lightfast Docs",
	url: "https://chat.lightfast.ai",
	ogImage: "https://lightfast.ai/og.jpg",
	description:
		"Documentation for Lightfast Chat - Learn how to build and deploy real-time AI chat applications with Claude 4, GPT-4o, and streaming responses.",
	links: {
		twitter: {
			title: "Twitter",
			href: "https://x.com/lightfastai",
			external: true,
		},
		github: {
			title: "GitHub",
			href: "https://github.com/lightfastai/chat",
			external: true,
		},
		discord: {
			title: "Discord",
			href: "https://discord.gg/YqPDfcar2C",
			external: true,
		},
		chat: {
			title: "Chat App",
			href: "https://chat.lightfast.ai",
			external: true,
		},
		home: {
			title: "Lightfast Home",
			href: "https://lightfast.ai",
			external: true,
		},
	},
	location: "3141, Melbourne, VIC, Australia",
};

// Export additional metadata for docs
export const docsMetadata = {
	keywords: [
		"Lightfast documentation",
		"AI chat docs",
		"Claude 4 integration",
		"GPT-4o integration",
		"real-time chat tutorial",
		"Convex database guide",
		"Next.js chat documentation",
		"AI assistant setup",
		"streaming API docs",
		"authentication guide",
		"deployment guide",
		"API reference",
		"developer docs",
	],
	authors: [
		{
			name: "Lightfast",
			url: "https://lightfast.ai",
		},
	],
	creator: "Lightfast",
} as const;
