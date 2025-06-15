"use client"

import { Badge } from "@/components/ui/badge"
import { Markdown } from "@/components/ui/markdown"
import { useResumableStream } from "@/hooks/useResumableStream"
import { cn } from "@/lib/utils"
import { Brain, ChevronDown, ChevronRight, Key } from "lucide-react"
import { useState } from "react"
import type { Doc } from "../../../convex/_generated/dataModel"

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

  // Helper function to format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`
    }
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`
    }
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  // Collapsible state for reasoning content
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false)

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
        <div className="mb-4 rounded-lg border border-muted bg-muted/20 p-3">
          <button
            type="button"
            onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
            className="flex w-full items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {isThinkingExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <Brain className="h-3 w-3" />
            <span>View reasoning process</span>
            {thinkingDuration && (
              <span className="ml-auto font-mono text-[10px]">
                {formatDuration(thinkingDuration)}
              </span>
            )}
          </button>
          {isThinkingExpanded && (
            <div className="mt-3 text-xs text-muted-foreground space-y-2">
              <p className="whitespace-pre-wrap font-mono leading-relaxed">
                {message.thinkingContent}
              </p>
            </div>
          )}
        </div>
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
