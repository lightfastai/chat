import { AuthRedirectHandler } from "@/components/auth/auth-redirect-handler"
import { LandingChatInput } from "@/components/landing/landing-chat-input"
import { siteConfig, siteMetadata } from "@/lib/site-config"
import { SiteFooter } from "@lightfast/ui/components/site-footer"
import { SiteHeader } from "@lightfast/ui/components/site-header"
import type { Metadata } from "next"

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
}

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

          {/* Chat input preview */}
          <div className="w-full">
            <LandingChatInput />
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
  )
}

// Main server component - SSR landing page with client-side auth handling
export default function Home() {
  return (
    <>
      {/* Client component handles auth redirects without affecting SSR */}
      <AuthRedirectHandler />

      {/* Server-rendered landing page */}
      <LandingPage />
    </>
  )
}
