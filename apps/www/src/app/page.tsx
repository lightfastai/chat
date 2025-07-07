import { siteConfig, siteMetadata } from "@/lib/site-config";
import { SiteFooter } from "@lightfast/ui/components/site-footer";
import { SiteHeader } from "@lightfast/ui/components/site-header";
import { Button } from "@lightfast/ui/components/ui/button";
import { ArrowUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

// Force static generation of this page
export const dynamic = 'force-static';

export const metadata: Metadata = {
	title: {
		default: siteConfig.name,
		template: `%s - ${siteConfig.name}`,
	},
	metadataBase: new URL(siteConfig.url),
	description: siteConfig.description,
	keywords: siteMetadata.keywords,
	authors: siteMetadata.authors,
	creator: siteMetadata.creator,
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
	applicationName: siteConfig.name,
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: siteConfig.name,
	},
	formatDetection: {
		telephone: false,
	},
};

// Landing page component - fully SSR
function LandingPage() {
	return (
		<div className="flex flex-col min-h-screen bg-background">
			<div className="px-8 py-4">
				<SiteHeader showGitHub={false} showDocs={false} />
			</div>

			{/* Main content */}
			<main className="flex-1 flex flex-col items-center justify-center container mx-auto px-4">
				<div className="max-w-4xl mx-auto w-full -mt-20">
					{/* Hero section */}
					<div className="text-center mb-8">
						<h1 className="text-2xl sm:text-4xl font-semibold text-foreground">
							What makes a good chat? You.
						</h1>
					</div>

					{/* Static chat input preview - links to /chat */}
					<div className="w-full">
						<Link href="/chat" className="block">
							<div className="w-full border border-muted/30 rounded-xl overflow-hidden flex flex-col transition-all bg-transparent dark:bg-input/10 hover:border-muted/50 cursor-pointer">
								<div className="flex-1">
									<div className="w-full resize-none border-0 p-3 bg-transparent dark:bg-input/10 text-sm text-muted-foreground" style={{lineHeight: "24px", minHeight: "72px"}}>
										Ask anything...
									</div>
								</div>
								<div className="flex items-center justify-end p-2 bg-transparent dark:bg-input/10">
									<Button
										variant="default"
										size="icon"
										className="h-8 w-8 p-0 rounded-full pointer-events-none"
									>
										<ArrowUp className="w-4 h-4" />
									</Button>
								</div>
							</div>
						</Link>
					</div>
				</div>
			</main>

			<div className="px-8">
				<SiteFooter
					siteName={siteConfig.name}
					homeUrl={siteConfig.url.replace("chat.", "")}
					links={{
						github: siteConfig.links.github.href,
						discord: siteConfig.links.discord.href,
						twitter: siteConfig.links.twitter.href,
						privacy: siteConfig.links.privacy.href,
						terms: siteConfig.links.terms.href,
						docs: siteConfig.links.docs.href,
					}}
				/>
			</div>
		</div>
	);
}

// Main server component - Static landing page (auth redirects handled by middleware)
export default function Home() {
	return <LandingPage />;
}
