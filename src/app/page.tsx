import { AuthRedirectHandler } from "@/components/auth/AuthRedirectHandler"
import { LandingChatInput } from "@/components/landing/LandingChatInput"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Zap } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Lightfast - Agent-first Chat Experience",
  description:
    "Experience the future of AI conversations with Lightfast. Our agent-first approach delivers intelligent, real-time chat interactions that understand context and provide meaningful responses.",
  keywords: [
    "AI chat",
    "artificial intelligence",
    "agent-first",
    "real-time chat",
    "conversational AI",
    "intelligent chat",
    "AI assistant",
    "machine learning",
    "natural language processing",
    "Lightfast",
  ],
  authors: [{ name: "Lightfast" }],
  creator: "Lightfast",
  publisher: "Lightfast",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://lightfast.ai",
    title: "Lightfast - Agent-first Chat Experience",
    description:
      "Experience the future of AI conversations with Lightfast. Our agent-first approach delivers intelligent, real-time chat interactions.",
    siteName: "Lightfast",
    images: [
      {
        url: "https://lightfast.ai/og-image.png",
        width: 1200,
        height: 630,
        alt: "Lightfast - Agent-first Chat Experience",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lightfast - Agent-first Chat Experience",
    description:
      "Experience the future of AI conversations with our agent-first approach to intelligent chat.",
    images: ["https://lightfast.ai/og-image.png"],
    creator: "@lightfast_ai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-code",
  },
}

// Lightfast logo component
function LightfastLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="104"
      height="70"
      viewBox="0 0 104 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Lightfast"
      {...props}
    >
      <title>Lightfast</title>
      <path
        d="M15.3354 57.3195H47.1597V69.7863H0.543457V0.632019H15.3354V57.3195Z"
        fill="currentColor"
      />
      <path
        d="M79.6831 69.7863H65.2798L89.0532 0.658386H103.457L79.6831 69.7863Z"
        fill="currentColor"
      />
    </svg>
  )
}

// Server-side header component for landing page
function LandingHeader() {
  return (
    <header className="bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/">
            <LightfastLogo className="w-6 h-5 text-foreground" />
          </Link>
        </div>
        <Link href="/signin">
          <Button variant="outline">Sign In</Button>
        </Link>
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
              Agent-first approach to chats.
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              What makes a good chat?
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
