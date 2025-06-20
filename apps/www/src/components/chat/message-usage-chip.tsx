"use client"

import { Badge } from "@repo/ui/components/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/tooltip"
import { Cpu } from "lucide-react"

interface MessageUsageChipProps {
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    reasoningTokens?: number
    cachedInputTokens?: number
  }
}

// Helper function to format token counts
function formatTokenCount(count: number): string {
  if (count === 0) return "0"
  if (count < 1000) return count.toString()
  if (count < 1000000) {
    const k = count / 1000
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`
  }
  const m = count / 1000000
  return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
}

export function MessageUsageChip({ usage }: MessageUsageChipProps) {
  // Don't show if no usage data
  if (!usage || !usage.outputTokens) {
    return null
  }

  const outputTokens = usage.outputTokens || 0
  const inputTokens = usage.inputTokens || 0
  const totalTokens = usage.totalTokens || 0
  const reasoningTokens = usage.reasoningTokens || 0
  const cachedInputTokens = usage.cachedInputTokens || 0

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="h-5 px-1.5 py-0 font-mono text-[10px] cursor-default"
          >
            <Cpu className="w-3 h-3 mr-0.5" />
            {formatTokenCount(outputTokens)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div className="font-semibold mb-1">Token Usage</div>
            <div>Input: {formatTokenCount(inputTokens)} tokens</div>
            <div>Output: {formatTokenCount(outputTokens)} tokens</div>
            <div className="border-t pt-1 mt-1">
              Total: {formatTokenCount(totalTokens)} tokens
            </div>
            {reasoningTokens > 0 && (
              <div>Reasoning: {formatTokenCount(reasoningTokens)} tokens</div>
            )}
            {cachedInputTokens > 0 && (
              <div>Cached: {formatTokenCount(cachedInputTokens)} tokens</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
