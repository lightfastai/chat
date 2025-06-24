"use client"

import { Markdown } from "@/components/ui/markdown"
import { getMessageParts } from "@/lib/message-parts"
import { cn } from "@/lib/utils"
import React from "react"
import type { Doc } from "../../../../convex/_generated/dataModel"
import { ToolInvocation } from "../tools/ToolInvocation"
import { AssistantMessageHeader } from "./AssistantMessageHeader"
import { MessageAvatar } from "./MessageAvatar"
import { MessageLayout } from "./MessageLayout"
import { ThinkingContent } from "./ThinkingContent"

type Message = Doc<"messages"> & { _streamId?: string | null }

export interface MessageItemProps {
  message: Message
  owner?: {
    name?: string | null
    image?: string | null
  }
  currentUser?: {
    name?: string | null
    image?: string | null
  }
  showThinking?: boolean
  showActions?: boolean
  isReadOnly?: boolean
  modelName?: string
  streamingText?: string
  isStreaming?: boolean
  isComplete?: boolean
  actions?: React.ReactNode
  className?: string
}

export function MessageItem({
  message,
  owner,
  currentUser,
  showThinking = true,
  showActions = true,
  isReadOnly = false,
  modelName,
  streamingText,
  isStreaming,
  isComplete,
  actions,
  className,
}: MessageItemProps) {
  const isAssistant = message.messageType === "assistant"

  // Calculate thinking duration
  const thinkingDuration = React.useMemo(() => {
    if (message.thinkingStartedAt && message.thinkingCompletedAt) {
      return message.thinkingCompletedAt - message.thinkingStartedAt
    }
    return null
  }, [message.thinkingStartedAt, message.thinkingCompletedAt])

  // Determine display user based on context
  const displayUser = isReadOnly ? owner : currentUser

  // Avatar component
  const avatar = (
    <MessageAvatar
      messageType={message.messageType}
      userImage={displayUser?.image || undefined}
      userName={displayUser?.name || undefined}
    />
  )

  // Determine what text to show
  const displayText =
    isStreaming && streamingText ? streamingText : message.body

  // Check if message has parts (new system) vs legacy body-only
  const hasParts = message.parts && message.parts.length > 0

  // Content component
  const content = (
    <div className={cn("space-y-1", className)}>
      {/* Assistant message header with consistent layout */}
      {isAssistant && (
        <AssistantMessageHeader
          modelName={modelName}
          usedUserApiKey={message.usedUserApiKey}
          isStreaming={isStreaming}
          isComplete={isComplete}
          thinkingStartedAt={message.thinkingStartedAt}
          thinkingCompletedAt={message.thinkingCompletedAt}
          usage={message.usage}
        />
      )}

      {/* Thinking content */}
      {showThinking &&
        message.hasThinkingContent &&
        message.thinkingContent && (
          <ThinkingContent
            content={message.thinkingContent}
            duration={thinkingDuration}
          />
        )}

      {/* Message body - use parts-based rendering for streaming or final display */}
      <div className="text-sm leading-relaxed">
        {(() => {
          // If message has parts, use parts-based rendering (new system)
          if (hasParts) {
            // Always use grouped parts to prevent line breaks between text chunks
            // The grouping function handles both streaming and completed states
            const parts = getMessageParts(message)

            return (
              <div className="space-y-2">
                {parts.map((part, index) => {
                  // Create a unique key based on part content
                  const partKey =
                    part.type === "tool-call"
                      ? `tool-call-${(part as any).toolCallId}`
                      : part.type === "tool-invocation"
                        ? `tool-invocation-${(part as any).toolInvocation.toolCallId}`
                        : `text-${index}`

                  switch (part.type) {
                    case "text":
                      return (
                        <div key={partKey}>
                          <Markdown className="text-sm">{part.text}</Markdown>
                          {isStreaming &&
                            !isComplete &&
                            index === parts.length - 1 && (
                              <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
                            )}
                        </div>
                      )
                    case "tool-call":
                      return <ToolInvocation key={partKey} part={part} />
                    case "tool-invocation":
                      // Legacy support - convert to new format
                      return <ToolInvocation key={partKey} part={part} />
                    default:
                      return null
                  }
                })}
              </div>
            )
          } else {
            // Legacy text rendering for messages without parts
            return displayText ? (
              <>
                <Markdown className="text-sm">{displayText}</Markdown>
                {isStreaming && !isComplete && (
                  <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
                )}
              </>
            ) : null
          }
        })()}
      </div>
    </div>
  )

  // Timestamp - disabled for now
  const timestamp = undefined

  // Actions (only for assistant messages in interactive mode)
  const messageActions =
    !isReadOnly &&
    showActions &&
    isAssistant &&
    message.isComplete !== false &&
    !message._streamId
      ? actions
      : undefined

  return (
    <MessageLayout
      avatar={avatar}
      content={content}
      timestamp={timestamp}
      actions={messageActions}
      messageType={message.messageType}
      className={undefined}
    />
  )
}
