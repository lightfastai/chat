import "./globals.css";
import { docsMetadata, siteConfig } from "@/src/lib/site-config";
import { fonts } from "@repo/ui/lib/fonts";
import { RootProvider } from "fumadocs-ui/provider";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DocsLayoutWrapper } from "../components/docs-layout-wrapper";

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={fonts} suppressHydrationWarning>
			<body className="min-h-screen bg-background text-foreground antialiased">
				<RootProvider>
					<DocsLayoutWrapper>{children}</DocsLayoutWrapper>
				</RootProvider>
			</body>
		</html>
	);
}

export const metadata: Metadata = {
	title: {
		default: siteConfig.name,
		template: `%s | ${siteConfig.name}`,
	},
	description: siteConfig.description,
	keywords: [...docsMetadata.keywords],
	authors: [...docsMetadata.authors],
	creator: docsMetadata.creator,
	metadataBase: new URL(siteConfig.url),
	openGraph: {
		type: "website",
		locale: "en_US",
		url: siteConfig.url,
		title: siteConfig.name,
		description: siteConfig.description,
		siteName: siteConfig.name,
		images: [
			{
				url: siteConfig.ogImage,
				width: 1200,
				height: 630,
				alt: siteConfig.name,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: siteConfig.name,
		description: siteConfig.description,
		images: [siteConfig.ogImage],
		creator: "@lightfastai",
	},
	icons: {
		icon: "/favicon.ico",
		shortcut: "/favicon-16x16.png",
		apple: "/apple-touch-icon.png",
		other: [
			{
				rel: "icon",
				url: "/favicon-32x32.png",
			},
			{
				rel: "icon",
				url: "/android-chrome-192x192.png",
			},
			{
				rel: "icon",
				url: "/android-chrome-512x512.png",
			},
		],
	},
};
