"use client"

import { Brain, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export interface ThinkingContentProps {
  content: string
  duration?: number | null
  variant?: "details" | "collapsible"
  isExpanded?: boolean
  onToggle?: (expanded: boolean) => void
}

// Helper function to format duration
export function formatDuration(ms: number) {
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

export function ThinkingContent({
  content,
  duration,
  variant = "collapsible",
  isExpanded: controlledExpanded,
  onToggle,
}: ThinkingContentProps) {
  const [localExpanded, setLocalExpanded] = useState(false)

  // Use controlled state if provided, otherwise use local state
  const isExpanded =
    controlledExpanded !== undefined ? controlledExpanded : localExpanded

  const handleToggle = (newExpanded: boolean) => {
    if (onToggle) {
      onToggle(newExpanded)
    } else {
      setLocalExpanded(newExpanded)
    }
  }

  if (variant === "details") {
    return (
      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-muted-foreground">
          View thinking process
          {duration && (
            <span className="ml-2 font-mono text-xs">
              ({formatDuration(duration)})
            </span>
          )}
        </summary>
        <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </details>
    )
  }

  return (
    <div className="mb-4 rounded-lg border border-muted bg-muted/20 p-3">
      <button
        type="button"
        onClick={() => handleToggle(!isExpanded)}
        className="flex w-full items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <Brain className="h-3 w-3" />
        <span>View reasoning process</span>
        {duration && (
          <span className="ml-auto font-mono text-[10px]">
            {formatDuration(duration)}
          </span>
        )}
      </button>
      {isExpanded && (
        <div className="mt-3 text-xs text-muted-foreground space-y-2">
          <p className="whitespace-pre-wrap font-mono leading-relaxed">
            {content}
          </p>
        </div>
      )}
    </div>
  )
}
