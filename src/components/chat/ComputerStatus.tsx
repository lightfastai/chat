"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { Cpu, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
// import type { Doc } from "../../../convex/_generated/dataModel"

type ComputerLifecycleState =
  | "initializing"
  | "ready"
  | "running"
  | "idle"
  | "error"
  | "stopped"

interface ComputerStatus {
  lifecycleState: ComputerLifecycleState
  instanceId?: string
  currentOperation?: string
  startedAt: number
  lastUpdateAt?: number
}

interface ComputerStatusProps {
  computerStatus?: ComputerStatus
  className?: string
}

export function ComputerStatus({
  computerStatus,
  className,
}: ComputerStatusProps) {
  const [isVisible, setIsVisible] = useState(false)

  // Show the accordion when computer instance exists (hide only when stopped)
  const shouldShow =
    computerStatus && computerStatus.lifecycleState !== "stopped"

  useEffect(() => {
    if (shouldShow) {
      // Small delay to trigger animation
      const timer = setTimeout(() => setIsVisible(true), 100)
      return () => clearTimeout(timer)
    }
    setIsVisible(false)
  }, [shouldShow])

  if (!shouldShow) {
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

  const getStatusText = (status: ComputerStatus) => {
    switch (status.lifecycleState) {
      case "initializing":
        return (
          status.currentOperation || "Setting up Lightfast Computer instance..."
        )
      case "ready":
        return status.currentOperation || "Computer instance ready"
      case "running":
        return status.currentOperation || "Processing..."
      case "idle":
        return status.currentOperation || "Ready for commands"
      case "error":
        return status.currentOperation || "Error occurred"
      default:
        return status.currentOperation || "Unknown state"
    }
  }

  return (
    <div className="px-2 sm:px-4 flex-shrink-0">
      <div className="max-w-3xl mx-auto">
        <Accordion
          type="single"
          collapsible
          className={cn(
            "mb-2 transition-all duration-300",
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2",
            computerStatus.lifecycleState === "error"
              ? "border rounded-lg border-red-500/20 bg-red-50/50 dark:bg-red-950/20"
              : computerStatus.lifecycleState === "idle"
                ? "border rounded-lg border-gray-300/50 bg-gray-50/30 dark:bg-gray-950/20"
                : "border rounded-lg border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20",
            className,
          )}
        >
          <AccordionItem value="computer-status" className="border-none">
            <AccordionTrigger
              className={cn(
                "hover:no-underline px-3 py-3",
                computerStatus.lifecycleState === "idle"
                  ? "hover:bg-gray-100/50 dark:hover:bg-gray-900/20"
                  : "hover:bg-blue-100/50 dark:hover:bg-blue-900/20",
              )}
            >
              <div className="flex items-center gap-3 flex-1 text-left">
                <div className="relative">
                  <Cpu
                    className={cn(
                      "h-5 w-5",
                      computerStatus.lifecycleState === "idle"
                        ? "text-gray-500 dark:text-gray-400"
                        : computerStatus.lifecycleState === "error"
                          ? "text-red-600 dark:text-red-400"
                          : "text-blue-600 dark:text-blue-400",
                    )}
                  />
                  {computerStatus.lifecycleState === "running" && (
                    <div className="absolute -bottom-1 -right-1">
                      <Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <span className="font-medium text-sm text-blue-900 dark:text-blue-100">
                    Lightfast Computer
                  </span>
                  <span className="text-xs text-blue-700/70 dark:text-blue-300/70">
                    {getStatusText(computerStatus)}
                  </span>
                  {duration > 0 && (
                    <span className="text-xs text-blue-600/60 dark:text-blue-400/60 ml-auto mr-2">
                      {formatDuration(duration)}
                    </span>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2 text-sm pt-2">
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
                    The computer instance is isolated and secure. Operations may
                    take a few moments to complete.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}
