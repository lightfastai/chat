import type React from "react"

interface ChatLayoutProps {
  children: React.ReactNode
}

// Minimal layout that just passes through children
// Individual chat pages handle their own layouts for prefetching optimization
export default function ChatLayout({ children }: ChatLayoutProps) {
  return children
}