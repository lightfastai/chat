"use client"

import { GuestChatProvider } from "@/providers/guest-chat-provider"
import { useConvexAuth } from "convex/react"

export function GuestWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()

  // Don't render until we know auth status
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <GuestChatProvider isAuthenticated={isAuthenticated}>
      {children}
    </GuestChatProvider>
  )
}
