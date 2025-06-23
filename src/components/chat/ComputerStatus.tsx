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

interface ComputerStatus {
  isRunning: boolean
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

  // Show the accordion only when computer is actively running or initializing
  const shouldShow =
    computerStatus &&
    (computerStatus.isRunning ||
      computerStatus.currentOperation === "Initializing environment...")

  useEffect(() => {
    if (shouldShow) {
      // Small delay to trigger animation
      const timer = setTimeout(() => setIsVisible(true), 100)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
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

  return (
    <div className="px-2 sm:px-4 flex-shrink-0">
      <div className="max-w-3xl mx-auto">
        <Accordion
          type="single"
          collapsible
          className={cn(
            "mb-2 transition-all duration-300",
            "border rounded-lg border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20",
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2",
            className,
          )}
        >
          <AccordionItem value="computer-status" className="border-none">
            <AccordionTrigger className="hover:no-underline px-3 py-3 hover:bg-blue-100/50 dark:hover:bg-blue-900/20">
              <div className="flex items-center gap-3 flex-1 text-left">
                <div className="relative">
                  <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  {computerStatus.isRunning && (
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
                    {computerStatus.currentOperation || "Processing..."}
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
