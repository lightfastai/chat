"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { type Preloaded, usePreloadedQuery, useQuery } from "convex/react"
import { Activity, Brain, ChevronRight } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

interface TokenUsageDialogProps {
  threadId: Id<"threads"> | "new"
  preloadedThreadUsage?: Preloaded<typeof api.messages.getThreadUsage>
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
    case "claude-4-sonnet-20250514":
      return "Claude 4 Sonnet"
    case "claude-4-sonnet-20250514-thinking":
      return "Claude 4 Sonnet (Thinking)"
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

export function TokenUsageDialog({
  threadId,
  preloadedThreadUsage,
}: TokenUsageDialogProps) {
  // Use preloaded usage data if available
  const preloadedUsage = preloadedThreadUsage
    ? usePreloadedQuery(preloadedThreadUsage)
    : null

  // Skip query for new chats or if we have preloaded data
  const usage =
    preloadedUsage ??
    useQuery(
      api.messages.getThreadUsage,
      threadId === "new" || preloadedUsage ? "skip" : { threadId },
    )

  // For new chats, show nothing
  if (threadId === "new") {
    return null
  }

  // If no usage data yet, show nothing
  if (!usage) {
    return null
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Activity className="w-4 h-4" />
          {formatTokenCount(usage.totalTokens)}
          <ChevronRight className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Token Usage</DialogTitle>
          <DialogDescription>
            Detailed breakdown of token usage for this conversation
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Overall Usage Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Overall Usage
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Input Tokens:</span>
                <span className="font-mono font-medium">
                  {formatTokenCount(usage.totalInputTokens)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Output Tokens:</span>
                <span className="font-mono font-medium">
                  {formatTokenCount(usage.totalOutputTokens)}
                </span>
              </div>
              {usage.totalReasoningTokens > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Reasoning Tokens:
                  </span>
                  <span className="font-mono font-medium">
                    {formatTokenCount(usage.totalReasoningTokens)}
                  </span>
                </div>
              )}
              {usage.totalCachedInputTokens > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cached Tokens:</span>
                  <span className="font-mono font-medium">
                    {formatTokenCount(usage.totalCachedInputTokens)}
                  </span>
                </div>
              )}
              <div className="col-span-2 pt-2 border-t">
                <div className="flex justify-between">
                  <span className="font-medium">Total Tokens:</span>
                  <span className="font-mono font-semibold">
                    {formatTokenCount(usage.totalTokens)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Model Breakdown Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Model Breakdown
            </h3>
            <ScrollArea className="h-[300px] rounded-md border p-2">
              <div className="space-y-4 pr-3">
                {usage.modelStats.map((modelStat) => (
                  <div
                    key={modelStat.model}
                    className="space-y-2 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {getModelDisplayName(modelStat.model)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {modelStat.messageCount} message
                        {modelStat.messageCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Input:</span>
                        <span className="font-mono">
                          {formatTokenCount(modelStat.inputTokens)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Output:</span>
                        <span className="font-mono">
                          {formatTokenCount(modelStat.outputTokens)}
                        </span>
                      </div>
                      {modelStat.reasoningTokens > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Reasoning:
                          </span>
                          <span className="font-mono">
                            {formatTokenCount(modelStat.reasoningTokens)}
                          </span>
                        </div>
                      )}
                      {modelStat.cachedInputTokens > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cached:</span>
                          <span className="font-mono">
                            {formatTokenCount(modelStat.cachedInputTokens)}
                          </span>
                        </div>
                      )}
                      <div className="col-span-2 pt-1 border-t">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-mono font-medium">
                            {formatTokenCount(modelStat.totalTokens)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
