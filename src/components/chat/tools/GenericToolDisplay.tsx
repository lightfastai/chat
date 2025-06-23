"use client"

import { ChevronDown, ChevronRight, Loader2, Wrench } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { ToolInvocationPart } from "./ToolInvocation"

export interface GenericToolDisplayProps {
  part: ToolInvocationPart
}

export function GenericToolDisplay({ part }: GenericToolDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusIcon = () => {
    switch (part.state) {
      case "partial-call":
      case "call":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "result":
        return <Wrench className="h-4 w-4 text-green-500" />
      case "error":
        return <Wrench className="h-4 w-4 text-red-500" />
      default:
        return <Wrench className="h-4 w-4" />
    }
  }

  const getStatusText = () => {
    switch (part.state) {
      case "partial-call":
        return "Preparing tool..."
      case "call":
        return `Calling ${part.toolName}...`
      case "result":
        return `${part.toolName} completed`
      case "error":
        return `${part.toolName} failed`
      default:
        return part.toolName || "Tool"
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
          {part.args && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Arguments:
              </p>
              <pre className="mt-1 overflow-auto rounded bg-background p-2 text-xs">
                {JSON.stringify(part.args, null, 2)}
              </pre>
            </div>
          )}

          {part.state === "result" && part.result && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Result:
              </p>
              <pre className="mt-1 overflow-auto rounded bg-background p-2 text-xs">
                {JSON.stringify(part.result, null, 2)}
              </pre>
            </div>
          )}

          {part.state === "error" && part.error && (
            <div>
              <p className="text-xs font-medium text-red-500">Error:</p>
              <p className="mt-1 text-xs text-red-500">{part.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}