import type { Metadata } from "next"
import { ChatInterface } from "../../components/chat/ChatInterface"

export const metadata: Metadata = {
  title: "New Chat - Lightfast",
  description: "Start intelligent conversations with AI agents.",
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
