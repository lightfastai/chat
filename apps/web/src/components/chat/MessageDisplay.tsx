"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getModelDisplayName } from "@/lib/ai"
import { useQuery } from "convex/react"
import { User } from "lucide-react"
import React from "react"
import { api } from "../../../convex/_generated/api"
import type { Doc } from "../../../convex/_generated/dataModel"
import { AttachmentPreview } from "./AttachmentPreview"
import { MessageActions } from "./MessageActions"
import { StreamingMessage } from "./StreamingMessage"

// Lightfast logo component
function LightfastLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="104"
      height="70"
      viewBox="0 0 104 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Lightfast"
      {...props}
    >
      <title>Lightfast</title>
      <path
        d="M15.3354 57.3195H47.1597V69.7863H0.543457V0.632019H15.3354V57.3195Z"
        fill="currentColor"
      />
      <path
        d="M79.6831 69.7863H65.2798L89.0532 0.658386H103.457L79.6831 69.7863Z"
        fill="currentColor"
      />
    </svg>
  )
}

type Message = Doc<"messages"> & { _streamId?: string | null }

interface MessageDisplayProps {
  message: Message
  userName: string
}

// Component to display individual messages with streaming support
export function MessageDisplay({ message, userName }: MessageDisplayProps) {
  const [thinkingDuration, setThinkingDuration] = React.useState<number | null>(
    null,
  )

  // Get current user for avatar display
  const currentUser = useQuery(api.users.current)

  // Calculate thinking duration
  // (This is still needed for StreamingMessage props)
  // If both timestamps are present, show duration
  // Otherwise, null
  // This logic can be simplified since we always use StreamingMessage
  React.useEffect(() => {
    if (message.thinkingStartedAt && message.thinkingCompletedAt) {
      setThinkingDuration(
        message.thinkingCompletedAt - message.thinkingStartedAt,
      )
    } else {
      setThinkingDuration(null)
    }
  }, [message.thinkingStartedAt, message.thinkingCompletedAt])

  const isAI = message.messageType === "assistant"

  // Always use StreamingMessage for all messages
  return (
    <div
      className={`flex gap-3 ${isAI ? "mt-6" : "mt-4"} ${!isAI ? "items-center" : ""} group/message`}
    >
      <Avatar className="w-8 h-8 shrink-0 rounded-md">
        {!isAI && currentUser?.image && (
          <AvatarImage
            src={currentUser.image}
            alt={currentUser.name || userName}
            className="object-cover"
          />
        )}
        <AvatarFallback
          className={`rounded-md ${isAI ? "bg-background text-primary" : "bg-secondary"}`}
        >
          {isAI ? (
            <LightfastLogo className="w-4 h-4" />
          ) : (
            <User className="w-4 h-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 relative">
        <StreamingMessage
          message={message}
          className="text-sm leading-relaxed"
          modelName={
            isAI
              ? message.modelId
                ? getModelDisplayName(message.modelId)
                : message.model
                  ? getModelDisplayName(message.model)
                  : "AI Assistant"
              : undefined
          }
          thinkingDuration={thinkingDuration}
        />

        {/* Show attachments if present */}
        {message.attachments && message.attachments.length > 0 && (
          <AttachmentPreview attachmentIds={message.attachments} />
        )}

        {/* Show feedback and copy buttons for completed AI messages */}
        {isAI && message.isComplete !== false && !message._streamId && (
          <div className="opacity-0 transition-opacity group-hover/message:opacity-100">
            <MessageActions message={message} />
          </div>
        )}
      </div>
    </div>
  )
}
