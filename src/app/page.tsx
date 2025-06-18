import { AuthRedirectHandler } from "@/components/auth/AuthRedirectHandler"
import { LandingChatInput } from "@/components/landing/LandingChatInput"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"
import { siteConfig } from "@/lib/site-config"
import { Zap } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  metadataBase: new URL(siteConfig.url),
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: siteConfig.authors,
  creator: siteConfig.creator,
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
    creator: siteConfig.links.twitter,
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

// Server-side header component for landing page
function LandingHeader() {
  return (
    <header className="bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Icons.logo className="w-6 h-5 text-foreground" />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/lightfastai/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </Link>
          <Link href="/signin">
            <Button variant="outline">Sign In</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}

// Landing page component - fully SSR
function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />

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

      <Footer />
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
