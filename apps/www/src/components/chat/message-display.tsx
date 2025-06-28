"use client"

import { getModelDisplayName } from "@/lib/ai"
import { useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import type { Doc } from "../../../convex/_generated/dataModel"
import { AttachmentPreview } from "./attachment-preview"
import { MessageActions } from "./message-actions"
import { MessageItem } from "./shared"

type Message = Doc<"messages">

interface MessageDisplayProps {
  message: Message
  userName: string
}

// Component to display individual messages with streaming support
export function MessageDisplay({ message }: MessageDisplayProps) {
  // Get current user for avatar display
  const currentUser = useQuery(api.users.current)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

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

  // Calculate thinking duration
  const thinkingDuration =
    message.thinkingStartedAt && message.thinkingCompletedAt
      ? message.thinkingCompletedAt - message.thinkingStartedAt
      : null

  // Actions component
  const actions = (
    <MessageActions
      message={message}
      modelName={modelName}
      thinkingDuration={thinkingDuration}
      onDropdownStateChange={setIsDropdownOpen}
    />
  )

  return (
    <>
      <MessageItem
        message={message}
        currentUser={currentUser || undefined}
        showActions={true}
        isReadOnly={false}
        modelName={modelName}
        streamingText={message.body}
        isStreaming={!!message.isStreaming}
        isComplete={message.isComplete !== false}
        actions={actions}
        forceActionsVisible={isDropdownOpen}
      />
      {/* Show attachments if present */}
      {message.attachments && message.attachments.length > 0 && (
        <AttachmentPreview attachmentIds={message.attachments} />
      )}
    </>
  )
}
