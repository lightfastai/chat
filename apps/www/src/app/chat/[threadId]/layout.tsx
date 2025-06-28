import type React from "react"

interface ThreadLayoutProps {
  children: React.ReactNode
}

// Thread-specific layout that bypasses the main chat layout to enable prefetching
export default function ThreadLayout({ children }: ThreadLayoutProps) {
  return children
}
