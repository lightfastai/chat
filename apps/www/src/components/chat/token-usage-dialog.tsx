"use client"

import { getModelConfig, getModelDisplayName, isValidModelId } from "@/lib/ai"
import { Button } from "@lightfast/ui/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lightfast/ui/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lightfast/ui/components/ui/dropdown-menu"
import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area"
import { type Preloaded, usePreloadedQuery, useQuery } from "convex/react"
import { Activity, MoreHorizontalIcon } from "lucide-react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

interface TokenUsageDialogProps {
  threadId: Id<"threads"> | "new"
  preloadedThreadUsage?: Preloaded<typeof api.messages.getThreadUsage>
}

// Helper function to format token counts
function formatTokenCount(count: number): string {
  if (count === 0) return "0"
  if (count < 1000) return count.toLocaleString()
  if (count < 1000000) {
    const k = count / 1000
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`
  }
  const m = count / 1000000
  return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
}

// Helper function to get model display name with fallback
function getDisplayNameForModel(model: string): string {
  // Use the AI library function for all known models
  if (isValidModelId(model)) {
    return getModelDisplayName(model)
  }

  // Fallback for legacy model IDs that might not be in the current schema
  const legacyMappings: Record<string, string> = {
    anthropic: "Claude Sonnet 4",
    openai: "GPT-4o Mini",
  }

  return legacyMappings[model] || model
}

export function TokenUsageDialog({
  threadId,
  preloadedThreadUsage,
}: TokenUsageDialogProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  // Use preloaded usage data if available
  const preloadedUsage = preloadedThreadUsage
    ? usePreloadedQuery(preloadedThreadUsage)
    : null

  // Check if this is an optimistic thread ID (not a real Convex ID)
  const isOptimisticThreadId = threadId !== "new" && !threadId.startsWith("k")

  // Skip query for new chats, optimistic IDs, or if we have preloaded data
  const usage =
    preloadedUsage ??
    useQuery(
      api.messages.getThreadUsage,
      threadId === "new" || isOptimisticThreadId || preloadedUsage
        ? "skip"
        : { threadId },
    )

  // For new chats, show nothing
  if (threadId === "new") {
    return null
  }

  // If no usage data yet, show nothing
  if (!usage) {
    return null
  }

  // Calculate total estimated cost
  const totalCost = usage.modelStats.reduce((sum, modelStat) => {
    const modelConfig = isValidModelId(modelStat.model)
      ? getModelConfig(modelStat.model)
      : null
    if (!modelConfig) return sum

    const inputCost =
      (modelStat.inputTokens * modelConfig.costPer1KTokens.input) / 1000
    const outputCost =
      (modelStat.outputTokens * modelConfig.costPer1KTokens.output) / 1000
    return sum + inputCost + outputCost
  }, 0)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
          >
            <MoreHorizontalIcon className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => setDialogOpen(true)}
            className="gap-2"
          >
            <Activity className="w-3 h-3" />
            <span className="text-xs">Usage</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {formatTokenCount(usage.totalTokens)}
            </span>
          </DropdownMenuItem>
          {/* Future menu items like Delete chat can be added here */}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Token Usage</DialogTitle>
            <DialogDescription>
              Token consumption breakdown for this conversation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Total Tokens
                </div>
                <div className="font-mono text-lg font-semibold">
                  {formatTokenCount(usage.totalTokens)}
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Messages
                </div>
                <div className="font-mono text-lg font-semibold">
                  {usage.messageCount}
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Est. Cost
                </div>
                <div className="font-mono text-lg font-semibold">
                  ${totalCost.toFixed(4)}
                </div>
              </div>
            </div>

            {/* Token Breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Token Breakdown
              </h3>
              <div className="space-y-2">
                <TokenRow label="Input" value={usage.totalInputTokens} />
                <TokenRow label="Output" value={usage.totalOutputTokens} />
                {usage.totalReasoningTokens > 0 && (
                  <TokenRow
                    label="Reasoning"
                    value={usage.totalReasoningTokens}
                  />
                )}
                {usage.totalCachedInputTokens > 0 && (
                  <TokenRow
                    label="Cached"
                    value={usage.totalCachedInputTokens}
                  />
                )}
              </div>
            </div>

            {/* Model Breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                By Model
              </h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-3">
                  {usage.modelStats.map((modelStat) => (
                    <ModelRow
                      key={modelStat.model}
                      model={modelStat.model}
                      stats={modelStat}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Token Row Component
interface TokenRowProps {
  label: string
  value: number
}

function TokenRow({ label, value }: TokenRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-medium">
        {formatTokenCount(value)}
      </span>
    </div>
  )
}

// Model Row Component
interface ModelRowProps {
  model: string
  stats: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    reasoningTokens: number
    cachedInputTokens: number
    messageCount: number
  }
}

function ModelRow({ model, stats }: ModelRowProps) {
  const displayName = getDisplayNameForModel(model)

  // Get model configuration for additional details
  const modelConfig = isValidModelId(model) ? getModelConfig(model) : null
  const isThinking =
    modelConfig?.features.thinking === true || model.includes("thinking")
  const providerName = modelConfig?.provider || "unknown"

  return (
    <div className="p-3 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-medium text-sm">{displayName}</div>
          <div className="text-xs text-muted-foreground">
            {stats.messageCount} message{stats.messageCount !== 1 ? "s" : ""}
            {isThinking && " • thinking mode"}
            {modelConfig && ` • ${providerName}`}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm font-semibold">
            {formatTokenCount(stats.totalTokens)}
          </div>
          <div className="text-xs text-muted-foreground">total</div>
        </div>
      </div>

      <div className="space-y-2">
        {/* Token breakdown */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Input</span>
            <span className="font-mono">
              {formatTokenCount(stats.inputTokens)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Output</span>
            <span className="font-mono">
              {formatTokenCount(stats.outputTokens)}
            </span>
          </div>
          {stats.reasoningTokens > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reasoning</span>
              <span className="font-mono">
                {formatTokenCount(stats.reasoningTokens)}
              </span>
            </div>
          )}
          {stats.cachedInputTokens > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cached</span>
              <span className="font-mono">
                {formatTokenCount(stats.cachedInputTokens)}
              </span>
            </div>
          )}
        </div>

        {/* Cost estimate (if model config available) */}
        {modelConfig && (
          <div className="pt-2 border-t border-border/30">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Est. Cost</span>
              <span className="font-mono">
                $
                {(
                  (stats.inputTokens * modelConfig.costPer1KTokens.input) /
                    1000 +
                  (stats.outputTokens * modelConfig.costPer1KTokens.output) /
                    1000
                ).toFixed(4)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
