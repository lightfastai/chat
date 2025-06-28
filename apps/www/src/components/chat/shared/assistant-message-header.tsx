"use client"

import type { Doc } from "../../../../convex/_generated/dataModel"
import { StreamingReasoningDisplay } from "./streaming-reasoning-display"

interface AssistantMessageHeaderProps {
  modelName?: string
  usedUserApiKey?: boolean
  isStreaming?: boolean
  thinkingStartedAt?: number
  thinkingCompletedAt?: number
  streamingText?: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    reasoningTokens?: number
    cachedInputTokens?: number
  }
  hasParts?: boolean
  message?: Doc<"messages">
}

export function AssistantMessageHeader({
  isStreaming,
  streamingText,
  hasParts,
  message,
}: AssistantMessageHeaderProps) {
  // Check if message has reasoning parts (including from legacy fields)
  const hasReasoningParts = Boolean(
    message?.parts?.some((part) => part.type === "reasoning") ||
      (message?.hasThinkingContent && message?.thinkingContent),
  )

  // Get reasoning content from parts or legacy fields
  const reasoningContent = (() => {
    // First try new parts-based system
    const partsContent = message?.parts
      ?.filter((part) => part.type === "reasoning")
      .map((part) => part.text)
      .join("\n")

    if (partsContent?.trim()) {
      return partsContent
    }

    // Fall back to legacy thinking content
    if (message?.hasThinkingContent && message?.thinkingContent) {
      return message.thinkingContent
    }

    return undefined
  })()

  // Check if message has any actual content
  const hasContent = (() => {
    // First check streamingText
    if (streamingText && streamingText.trim().length > 0) return true

    // Check if message has parts with content
    if (hasParts && message?.parts && message.parts.length > 0) {
      return message.parts.some(
        (part) =>
          (part.type === "text" && part.text && part.text.trim().length > 0) ||
          part.type === "tool-call",
      )
    }

    // Check message body as fallback
    if (message?.body && message.body.trim().length > 0) return true

    return false
  })()

  // Show streaming reasoning display
  return (
    <StreamingReasoningDisplay
      isStreaming={!!isStreaming}
      hasContent={hasContent}
      reasoningContent={reasoningContent}
      hasReasoningParts={hasReasoningParts}
    />
  )
}
