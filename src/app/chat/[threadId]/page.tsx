import { siteConfig } from "@/lib/site-config"
import { preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"
import { ChatInterface } from "../../../components/chat/ChatInterface"
import { ChatPreloadProvider } from "../../../components/chat/ChatPreloadContext"
import { getAuthToken } from "../../../lib/auth"
import { isClientId } from "../../../lib/nanoid"

export const metadata: Metadata = {
  title: "Chat Thread",
  description: "Continue your AI conversation.",
  openGraph: {
    title: `Chat Thread - ${siteConfig.name}`,
    description: "Continue your AI conversation.",
  },
  twitter: {
    title: `Chat Thread - ${siteConfig.name}`,
    description: "Continue your AI conversation.",
  },
  robots: {
    index: false,
    follow: false,
  },
}

interface ChatThreadPageProps {
  params: Promise<{
    threadId: string
  }>
}

// Server component for specific thread - optimized for SSR and instant navigation
export default async function ChatThreadPage({ params }: ChatThreadPageProps) {
  // Await params in Next.js 15
  const { threadId: threadIdString } = await params

  // Validate threadId format - basic check to prevent obvious invalid IDs
  // Also exclude reserved routes
  const reservedRoutes = ["settings", "new"]
  const isReservedRoute =
    reservedRoutes.includes(threadIdString) ||
    threadIdString.startsWith("settings/")
  if (!threadIdString || threadIdString.length < 10 || isReservedRoute) {
    notFound()
  }

  return (
    <Suspense fallback={<ChatInterface />}>
      <ChatThreadPageWithPreloadedData threadIdString={threadIdString} />
    </Suspense>
  )
}

// Server component that handles data preloading with PPR optimization
async function ChatThreadPageWithPreloadedData({
  threadIdString,
}: {
  threadIdString: string
}) {
  try {
    // Get authentication token for server-side requests
    const token = await getAuthToken()

    // If no authentication token, render regular chat interface
    if (!token) {
      return <ChatInterface />
    }

    // Determine if this is a client ID or thread ID
    const isClientIdThread = isClientId(threadIdString)

    // Preload user settings for all cases
    const preloadedUserSettings = await preloadQuery(
      api.userSettings.getUserSettings,
      {},
      { token },
    )

    if (isClientIdThread) {
      // Preload thread by client ID
      const preloadedThreadByClientId = await preloadQuery(
        api.threads.getByClientId,
        { clientId: threadIdString },
        { token },
      )

      // We can't preload messages yet since we don't know the thread ID
      // The useChat hook will handle this case
      return (
        <ChatPreloadProvider
          preloadedThreadByClientId={preloadedThreadByClientId}
        >
          <ChatInterface
            preloadedThreadByClientId={preloadedThreadByClientId}
            preloadedUserSettings={preloadedUserSettings}
          />
        </ChatPreloadProvider>
      )
    }

    // Preload thread by ID
    const threadId = threadIdString as Id<"threads">
    const preloadedThreadById = await preloadQuery(
      api.threads.get,
      { threadId },
      { token },
    )

    // Preload messages for this thread
    const preloadedMessages = await preloadQuery(
      api.messages.list,
      { threadId },
      { token },
    )

    // Also preload thread usage for the header
    const preloadedThreadUsage = await preloadQuery(
      api.messages.getThreadUsage,
      { threadId },
      { token },
    )

    return (
      <ChatPreloadProvider
        preloadedThreadById={preloadedThreadById}
        preloadedThreadUsage={preloadedThreadUsage}
        preloadedMessages={preloadedMessages}
      >
        <ChatInterface
          preloadedThreadById={preloadedThreadById}
          preloadedMessages={preloadedMessages}
          preloadedUserSettings={preloadedUserSettings}
        />
      </ChatPreloadProvider>
    )
  } catch (error) {
    // Log error but still render - don't break the UI
    console.warn("Server-side chat data preload failed:", error)

    // Fallback to regular chat interface
    return <ChatInterface />
  }
}
