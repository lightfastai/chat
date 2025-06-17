"use client"

import type { Preloaded } from "convex/react"
import { createContext, useContext } from "react"
import type { api } from "../../../convex/_generated/api"

interface ChatPreloadContextValue {
  preloadedThreadById?: Preloaded<typeof api.threads.get>
  preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>
  preloadedThreadUsage?: Preloaded<typeof api.messages.getThreadUsage>
}

const ChatPreloadContext = createContext<ChatPreloadContextValue | null>(null)

interface ChatPreloadProviderProps {
  children: React.ReactNode
  value: ChatPreloadContextValue
}

export function ChatPreloadProvider({
  children,
  value,
}: ChatPreloadProviderProps) {
  return (
    <ChatPreloadContext.Provider value={value}>
      {children}
    </ChatPreloadContext.Provider>
  )
}

export function useChatPreloadContext() {
  const context = useContext(ChatPreloadContext)
  return context || {}
}
