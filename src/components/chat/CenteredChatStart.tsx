"use client"

import { useConvexAuth } from "convex/react"
import { useAuth } from "@/hooks/useAuth"
import { useTimeGreeting } from "@/hooks/useTimeGreeting"
import { ZapIcon } from "lucide-react"
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
}

export function CenteredChatStart({
  onSendMessage,
  disabled = false,
  isLoading = false,
}: CenteredChatStartProps) {
  const { isAuthenticated } = useConvexAuth()
  const { displayName, email } = useAuth()
  const greeting = useTimeGreeting()

  const userName = isAuthenticated ? email || displayName : "Guest"

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-0 px-4">
      <div className="w-full max-w-3xl mx-auto -mt-16">
        <div className="text-center mb-4">
          <h1 className="text-4xl font-semibold text-foreground mb-2 flex items-center justify-center gap-4">
            <ZapIcon className="w-8 h-8 inline-block" />
            {greeting}, {userName}
          </h1>
          {!isAuthenticated && (
            <p className="text-muted-foreground mt-2">
              Start chatting as a guest. Sign in to save your history and get AI
              responses.
            </p>
          )}
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
