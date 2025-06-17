"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useQuery } from "convex/react"
import { Activity, Brain } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

interface TokenUsageHeaderProps {
  threadId: Id<"threads"> | "new"
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

// Helper function to get model display name
function getModelDisplayName(model: string): string {
  switch (model) {
    case "anthropic":
      return "Claude Sonnet 4"
    case "openai":
      return "GPT-4o Mini"
    case "claude-sonnet-4-20250514":
      return "Claude Sonnet 4"
    case "claude-sonnet-4-20250514-thinking":
      return "Claude Sonnet 4 (Thinking)"
    case "claude-3-5-sonnet-20241022":
      return "Claude 3.5 Sonnet"
    case "claude-3-haiku-20240307":
      return "Claude 3 Haiku"
    case "gpt-4o":
      return "GPT-4o"
    case "gpt-4o-mini":
      return "GPT-4o Mini"
    case "gpt-3.5-turbo":
      return "GPT-3.5 Turbo"
    default:
      return model
  }
}

export function TokenUsageHeader({ threadId }: TokenUsageHeaderProps) {
  // Skip query for new chats
  const usage = useQuery(
    api.messages.getThreadUsage,
    threadId === "new" ? "skip" : { threadId },
  )

  // For new chats, show nothing
  if (threadId === "new") {
    return null
  }

  // If no usage data yet, show nothing (loading state handled by Suspense)
  if (!usage) {
    return null
  }

  // Show usage even if 0, as long as we have the data structure
  // This allows showing 0 tokens for new threads that haven't sent messages yet

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Token Usage Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="font-mono">
              <Activity className="w-3 h-3 mr-1" />
              {formatTokenCount(usage.totalTokens)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <div>
                Input: {formatTokenCount(usage.totalInputTokens)} tokens
              </div>
              <div>
                Output: {formatTokenCount(usage.totalOutputTokens)} tokens
              </div>
              <div>Total: {formatTokenCount(usage.totalTokens)} tokens</div>
              {usage.totalReasoningTokens > 0 && (
                <div>
                  Reasoning: {formatTokenCount(usage.totalReasoningTokens)}{" "}
                  tokens
                </div>
              )}
              {usage.totalCachedInputTokens > 0 && (
                <div>
                  Cached: {formatTokenCount(usage.totalCachedInputTokens)}{" "}
                  tokens
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Models Used */}
        {usage.modelStats.map((modelStat) => (
          <Tooltip key={modelStat.model}>
            <TooltipTrigger asChild>
              <Badge variant="outline">
                <Brain className="w-3 h-3 mr-1" />
                {getModelDisplayName(modelStat.model)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                <div>Model: {getModelDisplayName(modelStat.model)}</div>
                <div>Messages: {modelStat.messageCount}</div>
                <div>
                  Input: {formatTokenCount(modelStat.inputTokens)} tokens
                </div>
                <div>
                  Output: {formatTokenCount(modelStat.outputTokens)} tokens
                </div>
                <div>
                  Total: {formatTokenCount(modelStat.totalTokens)} tokens
                </div>
                {modelStat.reasoningTokens > 0 && (
                  <div>
                    Reasoning: {formatTokenCount(modelStat.reasoningTokens)}{" "}
                    tokens
                  </div>
                )}
                {modelStat.cachedInputTokens > 0 && (
                  <div>
                    Cached: {formatTokenCount(modelStat.cachedInputTokens)}{" "}
                    tokens
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
