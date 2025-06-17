import { siteConfig } from "@/lib/site-config"
import { preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { Suspense } from "react"
import { api } from "../../../convex/_generated/api"
import { ChatInterface } from "../../components/chat/ChatInterface"
import { getAuthToken } from "../../lib/auth"

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

// Server component that enables SSR for the new chat page with prefetched user data
export default function ChatPage() {
  return (
    <Suspense fallback={<ChatInterface />}>
      <ChatPageWithPreloadedData />
    </Suspense>
  )
}

// Server component that handles data preloading with PPR optimization
async function ChatPageWithPreloadedData() {
  try {
    // Get authentication token for server-side requests
    const token = await getAuthToken()

    // If no authentication token, render regular chat interface
    if (!token) {
      return <ChatInterface />
    }

    // Preload user data for PPR - this will be cached and streamed instantly
    const preloadedUser = await preloadQuery(api.users.current, {}, { token })

    // Pass preloaded user data to chat interface
    return <ChatInterface preloadedUser={preloadedUser} />
  } catch (error) {
    // Log error but still render - don't break the UI
    console.warn("Server-side user preload failed:", error)

    // Fallback to regular chat interface
    return <ChatInterface />
  }
}
