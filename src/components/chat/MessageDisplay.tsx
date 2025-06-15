"use client"

import { getModelDisplayName } from "@/lib/ai"
import { useResumableStream } from "@/hooks/useResumableStream"
import { useQuery } from "convex/react"
import React from "react"
import { api } from "../../../convex/_generated/api"
import type { Doc } from "../../../convex/_generated/dataModel"
import { AttachmentPreview } from "./AttachmentPreview"
import { MessageActions } from "./MessageActions"
import { MessageItem } from "./shared"

type Message = Doc<"messages"> & { _streamId?: string | null }

interface MessageDisplayProps {
  message: Message
  userName: string
}

// Component to display individual messages with streaming support
export function MessageDisplay({ message, userName }: MessageDisplayProps) {
  // Get current user for avatar display
  const currentUser = useQuery(api.users.current)

  // Get streaming data if message is streaming
  const { streamingText, isComplete } = useResumableStream({
    streamId: message._streamId || null,
    enabled: !!message._streamId && !!message.isStreaming,
  })

  const isAI = message.messageType === "assistant"

  // Model name for AI messages
  const modelName = isAI
    ? message.modelId
      ? getModelDisplayName(message.modelId)
      : message.model
        ? getModelDisplayName(message.model)
        : "AI Assistant"
    : undefined

  // Actions component
  const actions = <MessageActions message={message} />

  return (
    <>
      <MessageItem
        message={message}
        currentUser={currentUser}
        showThinking={true}
        showActions={true}
        isReadOnly={false}
        modelName={modelName}
        streamingText={streamingText}
        isStreaming={!!message.isStreaming}
        isComplete={isComplete}
        actions={actions}
      />
      {/* Show attachments if present */}
      {message.attachments && message.attachments.length > 0 && (
        <AttachmentPreview attachmentIds={message.attachments} />
      )}
    </>
  )
}
