import { siteConfig } from "@/lib/site-config"
import type { Metadata } from "next"
import { ChatInterface } from "../../components/chat/ChatInterface"

export const metadata: Metadata = {
  title: "New Chat",
  description:
    "Start intelligent conversations with AI agents using Lightfast.",
  openGraph: {
    title: `New Chat - ${siteConfig.name}`,
    description:
      "Start intelligent conversations with AI agents using Lightfast.",
    url: `${siteConfig.url}/chat`,
  },
  twitter: {
    title: `New Chat - ${siteConfig.name}`,
    description:
      "Start intelligent conversations with AI agents using Lightfast.",
  },
  robots: {
    index: false,
    follow: false,
  },
}

// Server component that enables SSR for the new chat page
export default function ChatPage() {
  // This server component provides the static shell
  // Client-side hydration happens in ChatInterface and ChatLayoutClient
  return <ChatInterface />
}
