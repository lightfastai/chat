"use client"

import { useAuth } from "@/hooks/useAuth"
import { useTimeGreeting } from "@/hooks/useTimeGreeting"
import type { Preloaded } from "convex/react"
import { usePreloadedQuery } from "convex/react"
import { ZapIcon } from "lucide-react"
import type { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { ChatInput } from "./ChatInput"

interface CenteredChatStartProps {
  onSendMessage: (
    message: string,
    modelId: string,
    attachments?: Id<"files">[],
    webSearchEnabled?: boolean,
  ) => Promise<void> | void
  disabled?: boolean
  isLoading?: boolean
  preloadedUser?: Preloaded<typeof api.users.current>
}

export function CenteredChatStart({
  onSendMessage,
  disabled = false,
  isLoading = false,
  preloadedUser,
}: CenteredChatStartProps) {
  const { displayName, email } = useAuth()
  const greeting = useTimeGreeting()

  // Use preloaded user data if available, otherwise fall back to regular auth hook
  const preloadedUserData = preloadedUser
    ? (() => {
        try {
          return usePreloadedQuery(preloadedUser)
        } catch {
          return null // Fallback to regular auth hook if preloaded data fails
        }
      })()
    : null

  const userName =
    preloadedUserData?.email || preloadedUserData?.name || email || displayName

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-0 px-2 sm:px-4">
      <div className="w-full max-w-3xl mx-auto -mt-8 sm:-mt-16">
        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-4xl font-semibold text-foreground mb-2 flex items-center justify-center gap-2 sm:gap-4">
            <ZapIcon className="w-6 h-6 sm:w-8 sm:h-8 inline-block" />
            {greeting}, {userName}
          </h1>
        </div>

        <ChatInput
          onSendMessage={onSendMessage}
          placeholder="How can I help you today?"
          disabled={disabled}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
