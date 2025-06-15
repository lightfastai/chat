"use client"

import { Badge } from "@/components/ui/badge"
import { Markdown } from "@/components/ui/markdown"
import { useResumableStream } from "@/hooks/useResumableStream"
import { cn } from "@/lib/utils"
import { Key } from "lucide-react"
import type { Doc } from "../../../convex/_generated/dataModel"
import { ThinkingContent, formatDuration } from "./shared/ThinkingContent"

type Message = Doc<"messages"> & { _streamId?: string | null }

interface StreamingMessageProps {
  message: Message
  className?: string
  modelName?: string
  thinkingDuration?: number | null
}

export function StreamingMessage({
  message,
  className,
  modelName,
  thinkingDuration,
}: StreamingMessageProps) {
  const { streamingText, isComplete } = useResumableStream({
    streamId: message._streamId || null,
    enabled: !!message._streamId && !!message.isStreaming,
  })

  // Determine what text to show
  const displayText =
    message.isStreaming && message._streamId
      ? streamingText || message.body
      : message.body

  // Show thinking indicator if streaming but no text yet
  const isThinking = message.isStreaming && !displayText && !isComplete

  return (
    <div className={cn("space-y-1", className)}>
      {/* Model name and thinking duration at the top, like non-streaming UI */}
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
        {message.isStreaming && !isComplete && !thinkingDuration && (
          <>
            {modelName && <span>•</span>}
            <span>{isThinking ? "Thinking" : "Responding"}</span>
          </>
        )}
      </div>
      {/* Reasoning/thinking content (Claude's thoughts) */}
      {message.hasThinkingContent && message.thinkingContent && (
        <ThinkingContent
          content={message.thinkingContent}
          duration={thinkingDuration}
        />
      )}
      <div className="text-sm leading-relaxed">
        {isThinking && !displayText ? (
          <span className="text-muted-foreground italic">Thinking</span>
        ) : displayText ? (
          <>
            <Markdown className="text-sm">{displayText}</Markdown>
            {message.isStreaming && !isComplete && (
              <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 opacity-70" />
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
