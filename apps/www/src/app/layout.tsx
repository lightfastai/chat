import type { Metadata, Viewport } from "next";
import "@lightfast/ui/globals.css";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { env } from "@/env";
import { siteConfig, siteMetadata } from "@/lib/site-config";
import { ClerkProvider } from "@clerk/nextjs";
import { fonts } from "@lightfast/ui/lib/fonts";
import { cn } from "@lightfast/ui/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";

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

export const viewport: Viewport = {
	themeColor: "#09090b",
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

export default function RootLayout({
	children,
}: { children: React.ReactNode }) {
	return (
		<ClerkProvider
			publishableKey={env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
			afterSignInUrl="/chat"
			afterSignUpUrl="/chat"
			afterSignOutUrl="https://lightfast.ai"
			signInUrl={process.env.NODE_ENV === "production" ? "https://auth.lightfast.ai/sign-in" : "http://localhost:4104/sign-in"}
			signUpUrl={process.env.NODE_ENV === "production" ? "https://auth.lightfast.ai/sign-up" : "http://localhost:4104/sign-up"}
		>
			<html lang="en" suppressHydrationWarning>
				<body className={cn(fonts, "dark", "flex min-h-screen flex-col")}>
					<ConvexClientProvider>{children}</ConvexClientProvider>
					<Toaster theme="dark" position="top-right" />
					<Analytics />
					<SpeedInsights />
				</body>
			</html>
		</ClerkProvider>
	);
}
