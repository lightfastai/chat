import { ChatLayout as ChatLayoutImplementation } from "@/components/chat/ChatLayout"
import { TooltipProvider } from "@/components/ui/tooltip"
import type React from "react"

interface ChatLayoutProps {
  children: React.ReactNode
}

// Server component layout - provides static shell and enables SSR with PPR
export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <TooltipProvider>
      <ChatLayoutImplementation>{children}</ChatLayoutImplementation>
    </TooltipProvider>
  )
}
