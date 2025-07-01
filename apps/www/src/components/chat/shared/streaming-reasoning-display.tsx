"use client"

import { Markdown } from "@lightfast/ui/components/ui/markdown"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import { ThinkingIndicator } from "./thinking-indicator"

interface StreamingReasoningDisplayProps {
  isStreaming: boolean
  hasContent: boolean
  reasoningContent?: string
  hasReasoningParts: boolean
}

export function StreamingReasoningDisplay({
  isStreaming,
  hasContent,
  reasoningContent,
  hasReasoningParts,
}: StreamingReasoningDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Only show when there are reasoning parts or when actively thinking/reasoning
  if (!hasReasoningParts && (!isStreaming || hasContent)) {
    return null
  }

  // Show "Thinking" initially, then switch to "Reasoning" when reasoning parts appear
  const label = hasReasoningParts ? "Reasoning" : "Thinking"

  // If no reasoning parts yet, just show the thinking indicator (during streaming)
  if (!hasReasoningParts) {
    return (
      <div className="mb-2 flex items-center gap-2 min-h-5">
        <ThinkingIndicator label={label} />
      </div>
    )
  }

  // When reasoning parts are detected, show expandable reasoning display (persists after completion)
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 min-h-5">
        <ThinkingIndicator label={label} />
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Expanded reasoning content */}
      {isExpanded && reasoningContent && (
        <div className="mt-3 text-xs text-muted-foreground max-w-none">
          <Markdown className="prose prose-xs max-w-none [&>*]:text-muted-foreground">
            {reasoningContent}
          </Markdown>
        </div>
      )}
    </div>
  )
}
