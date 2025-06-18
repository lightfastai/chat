"use client"

import { Badge } from "@/components/ui/badge"
import { Key } from "lucide-react"
import { MessageUsageChip } from "../MessageUsageChip"
import { formatDuration } from "./ThinkingContent"

interface AssistantMessageHeaderProps {
  modelName?: string
  usedUserApiKey?: boolean
  isStreaming?: boolean
  isComplete?: boolean
  thinkingStartedAt?: number
  thinkingCompletedAt?: number
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    reasoningTokens?: number
    cachedInputTokens?: number
  }
}

export function AssistantMessageHeader({
  modelName,
  usedUserApiKey,
  isStreaming,
  isComplete,
  thinkingStartedAt,
  thinkingCompletedAt,
  usage,
}: AssistantMessageHeaderProps) {
  // Calculate thinking duration
  const thinkingDuration =
    thinkingStartedAt && thinkingCompletedAt
      ? thinkingCompletedAt - thinkingStartedAt
      : null

  // Determine if we should show the header at all
  const shouldShowHeader =
    modelName || usedUserApiKey || thinkingDuration || isStreaming || usage

  if (!shouldShowHeader) {
    return null
  }

  // Determine status text to prevent layout shifts
  const statusText = (() => {
    if (isStreaming && !isComplete) {
      return "Thinking"
    }
    if (thinkingDuration) {
      return `Thought for ${formatDuration(thinkingDuration)}`
    }
    return null
  })()

  return (
    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2 min-h-5">
      {/* Model name - always first */}
      {modelName && <span>{modelName}</span>}

      {/* API Key badge - always second, consistent position */}
      {usedUserApiKey && (
        <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
          <Key className="w-3 h-3 mr-1" />
          Your API Key
        </Badge>
      )}

      {/* Status text - thinking or completed, third position */}
      {statusText && (
        <>
          {(modelName || usedUserApiKey) && <span>•</span>}
          <span className={thinkingDuration ? "font-mono" : ""}>
            {statusText}
          </span>
        </>
      )}

      {/* Usage chip - only for completed messages, last position */}
      {!isStreaming && usage && (
        <>
          {(modelName || usedUserApiKey || statusText) && <span>•</span>}
          <MessageUsageChip usage={usage} />
        </>
      )}
    </div>
  )
}
