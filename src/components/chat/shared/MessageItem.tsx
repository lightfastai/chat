"use client"

import { Markdown } from "@/components/ui/markdown"
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

      {/* Message body - temporarily disable parts rendering to debug */}
      <div className="text-sm leading-relaxed">
        {false && message.parts && Array.isArray(message.parts) && message.parts.some(p => p.type === "tool-invocation") ? (
          // Render message parts including tool invocations
          <div className="space-y-2">
            {/* Always render the message body text first if available */}
            {displayText && (
              <>
                <Markdown className="text-sm">{displayText}</Markdown>
                {isStreaming && !isComplete && (
                  <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
                )}
              </>
            )}
            {/* Then render tool invocations */}
            {message.parts.map((part, index) => {
              switch (part.type) {
                case "tool-invocation":
                  return <ToolInvocation key={index} part={part as Extract<typeof part, { type: "tool-invocation" }>} />
                case "reasoning":
                  // Reasoning content is already handled by ThinkingContent above
                  return null
                default:
                  return null
              }
            })}
          </div>
        ) : (
          // Fallback to original rendering for backward compatibility
          displayText ? (
            <>
              <Markdown className="text-sm">{displayText}</Markdown>
              {isStreaming && !isComplete && (
                <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
              )}
            </>
          ) : null
        )}
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
