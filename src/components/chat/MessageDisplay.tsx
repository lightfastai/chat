"use client"

import { getModelDisplayName } from "@/lib/ai"
import { useQuery } from "convex/react"
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
export function MessageDisplay({ message }: MessageDisplayProps) {
  // Get current user for avatar display
  const currentUser = useQuery(api.users.current)

  // For streaming messages, use the body directly
  // The body is updated as parts are added
  const streamingText = message.body
  const isComplete = message.isComplete !== false

  const isAI = message.messageType === "assistant"

  // Model name for AI messages
  const modelName = isAI
    ? message.modelId
      ? getModelDisplayName(message.modelId)
      : message.model
        ? getModelDisplayName(message.model)
        : "AI Assistant"
    : undefined

  // Debug logging for model display issues
  if (isAI && process.env.NODE_ENV === "development") {
    console.log("MessageDisplay debug:", {
      messageId: message._id,
      modelId: message.modelId,
      model: message.model,
      modelName,
      isStreaming: message.isStreaming,
      usedUserApiKey: message.usedUserApiKey,
      hasThinkingContent: message.hasThinkingContent,
      isComplete: message.isComplete,
    })
  }

  // Actions component
  const actions = <MessageActions message={message} />

  return (
    <>
      <MessageItem
        message={message}
        currentUser={currentUser || undefined}
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
