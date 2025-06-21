import { AuthRedirectHandler } from "@/components/auth/auth-redirect-handler"
import { LandingChatInput } from "@/components/landing/landing-chat-input"
import { siteConfig, siteMetadata } from "@/lib/site-config"
import { SiteFooter } from "@repo/ui/components/site-footer"
import { SiteHeader } from "@repo/ui/components/site-header"
import { Zap } from "lucide-react"
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
      <SiteHeader
        githubUrl={siteConfig.links.github.href}
        docsUrl={siteConfig.links.docs.href}
      />

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-48">
        <div className="max-w-4xl mx-auto">
          {/* Hero section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-muted/50 border rounded-full px-4 py-2 text-sm text-muted-foreground mb-6">
              <Zap className="w-4 h-4" />
              Open source chat for personal & business needs.
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              What makes a good chat? You.
            </h1>
          </div>

          {/* Chat input preview */}
          <div className="max-w-4xl mx-auto">
            <LandingChatInput />
          </div>
        </div>
      </main>

      <SiteFooter
        siteName={siteConfig.name}
        homeUrl={siteConfig.url.replace("chat.", "")}
        links={{
          github: siteConfig.links.github.href,
          discord: siteConfig.links.discord.href,
          twitter: siteConfig.links.twitter.href,
          privacy: siteConfig.links.privacy.href,
          terms: siteConfig.links.terms.href,
        }}
      />
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
