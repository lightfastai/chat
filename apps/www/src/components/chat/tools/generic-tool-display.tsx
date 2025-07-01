"use client"

import type { ToolCallPart } from "@/lib/message-parts"
import { ChevronDown, ChevronRight, Loader2, Wrench } from "lucide-react"
import { useState } from "react"

export interface GenericToolDisplayProps {
  toolCall: ToolCallPart
}

export function GenericToolDisplay({ toolCall }: GenericToolDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusIcon = () => {
    switch (toolCall.state) {
      case "partial-call":
      case "call":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "result":
        return <Wrench className="h-4 w-4 text-green-500" />
      default:
        return <Wrench className="h-4 w-4" />
    }
  }

  const getStatusText = () => {
    switch (toolCall.state) {
      case "partial-call":
        return "Preparing tool..."
      case "call":
        return `Calling ${toolCall.toolName}...`
      case "result":
        return `${toolCall.toolName} completed`
      default:
        return toolCall.toolName || "Tool"
    }
  }

  return (
    <div className="my-2 rounded-lg border border-border bg-muted/50 p-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {toolCall.args && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Arguments:
              </p>
              <pre className="mt-1 overflow-auto rounded bg-background p-2 text-xs">
                {JSON.stringify(toolCall.args, null, 2)}
              </pre>
            </div>
          )}

          {toolCall.state === "result" && toolCall.result && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Result:
              </p>
              <pre className="mt-1 overflow-auto rounded bg-background p-2 text-xs">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
