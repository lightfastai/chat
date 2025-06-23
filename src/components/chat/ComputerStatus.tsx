"use client"

import { ChevronDown, Cpu, Loader2 } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
// import type { Doc } from "../../../convex/_generated/dataModel"

interface ComputerStatusProps {
  computerStatus?: any // TODO: Use Doc<"threads">["computerStatus"] once types are synced
  className?: string
}

export function ComputerStatus({ computerStatus, className }: ComputerStatusProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (!computerStatus?.isRunning) {
    return null
  }

  const duration = computerStatus.startedAt
    ? Math.floor((Date.now() - computerStatus.startedAt) / 1000)
    : 0

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${seconds}s`
  }

  return (
    <Card
      className={cn(
        "mx-4 mb-4 overflow-hidden transition-all duration-200",
        "border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full h-auto p-3 justify-between hover:bg-blue-100/50 dark:hover:bg-blue-900/20"
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="absolute -bottom-1 -right-1">
              <Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <span className="font-medium text-sm text-blue-900 dark:text-blue-100">
            Lightfast Computer is currently running
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-blue-600 dark:text-blue-400 transition-transform duration-200",
            !isExpanded && "-rotate-90",
          )}
        />
      </Button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Status:</span>
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              {computerStatus.currentOperation || "Running"}
            </span>
          </div>
          
          {computerStatus.instanceId && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Instance:</span>
              <span className="font-mono text-xs text-blue-700 dark:text-blue-300">
                {computerStatus.instanceId.slice(0, 8)}...
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-muted-foreground">
            <span>Duration:</span>
            <span className="text-blue-700 dark:text-blue-300">
              {formatDuration(duration)}
            </span>
          </div>

          <div className="mt-3 pt-2 border-t border-blue-200/50 dark:border-blue-800/50">
            <p className="text-xs text-muted-foreground">
              The computer instance is isolated and secure. Operations may take a few moments to complete.
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}