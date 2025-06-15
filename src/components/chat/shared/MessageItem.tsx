"use client"

import { Badge } from "@/components/ui/badge"
import { Markdown } from "@/components/ui/markdown"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Key } from "lucide-react"
import React from "react"
import type { Doc } from "../../../../convex/_generated/dataModel"
import { MessageAvatar } from "./MessageAvatar"
import { MessageLayout } from "./MessageLayout"
import { ThinkingContent, formatDuration } from "./ThinkingContent"

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
  const displayText = isStreaming && streamingText ? streamingText : message.body

  // Show thinking indicator if streaming but no text yet
  const isThinking = isStreaming && !displayText && !isComplete

  // Content component
  const content = (
    <div className={cn("space-y-1", className)}>
      {/* Model name and metadata for assistant messages */}
      {isAssistant && (modelName || message.usedUserApiKey || thinkingDuration || isStreaming) && (
        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
          {modelName && <span>{modelName}</span>}
          {message.usedUserApiKey && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
              <Key className="w-3 h-3 mr-1" />
              Your API Key
            </Badge>
          )}
          {thinkingDuration && (
            <>
              <span>•</span>
              <span className="font-mono">
                Thought for {formatDuration(thinkingDuration)}
              </span>
            </>
          )}
          {isStreaming && !isComplete && !thinkingDuration && (
            <>
              {modelName && <span>•</span>}
              <span>{isThinking ? "Thinking" : "Responding"}</span>
            </>
          )}
        </div>
      )}

      {/* Thinking content */}
      {showThinking && message.hasThinkingContent && message.thinkingContent && (
        <ThinkingContent
          content={message.thinkingContent}
          duration={thinkingDuration}
          variant={isReadOnly ? "details" : "collapsible"}
        />
      )}

      {/* Message body */}
      {isReadOnly && !isAssistant ? (
        // Simple text display for user messages in read-only mode
        <div className="inline-block rounded-lg px-4 py-2 bg-muted">
          <p className="whitespace-pre-wrap">{message.body}</p>
        </div>
      ) : isReadOnly && isAssistant ? (
        // Styled message for assistant in read-only mode
        <div className="inline-block rounded-lg px-4 py-2 bg-primary text-primary-foreground">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown>{message.body}</Markdown>
          </div>
        </div>
      ) : (
        // Interactive mode message display
        <div className="text-sm leading-relaxed">
          {isThinking && !displayText ? (
            <span className="text-muted-foreground italic">Thinking</span>
          ) : displayText ? (
            <>
              <Markdown className="text-sm">{displayText}</Markdown>
              {isStreaming && !isComplete && (
                <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )

  // Timestamp
  const timestamp = (
    <span className="text-xs text-muted-foreground">
      {format(new Date(message.timestamp), "h:mm a")}
    </span>
  )

  // Actions (only for assistant messages in interactive mode)
  const messageActions = !isReadOnly && showActions && isAssistant && message.isComplete !== false && !message._streamId
    ? actions
    : undefined

  return (
    <MessageLayout
      avatar={avatar}
      content={content}
      timestamp={timestamp}
      actions={messageActions}
      messageType={message.messageType}
      className={isReadOnly && isAssistant ? "flex-row-reverse" : undefined}
    />
  )
}