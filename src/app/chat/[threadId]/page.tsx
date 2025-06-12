import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ChatInterface } from "../../../components/chat/ChatInterface"

export const metadata: Metadata = {
  title: "Chat Thread - Lightfast",
  description: "Continue your AI conversation.",
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
  if (!threadIdString || threadIdString.length < 10) {
    notFound()
  }

  // Server component provides the static shell
  // Client-side queries handle data fetching and validation via pathname
  // This enables instant navigation with prefetched data
  return <ChatInterface />
}
