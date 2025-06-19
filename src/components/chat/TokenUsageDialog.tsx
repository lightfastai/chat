"use client"

import { Badge } from "@/components/ui/badge"
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
import { Separator } from "@/components/ui/separator"
import { type Preloaded, usePreloadedQuery, useQuery } from "convex/react"
import {
  Activity,
  BarChart3,
  Brain,
  ChevronRight,
  Database,
  MessageSquare,
  TrendingUp,
  Zap,
} from "lucide-react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

interface TokenUsageDialogProps {
  threadId: Id<"threads"> | "new"
  preloadedThreadUsage?: Preloaded<typeof api.messages.getThreadUsage>
}

// Helper function to format token counts with enhanced display
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

// Helper function to get token type color and icon
function getTokenTypeStyles(
  type: "input" | "output" | "reasoning" | "cached" | "total",
) {
  switch (type) {
    case "input":
      return {
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-900/20",
        icon: TrendingUp,
      }
    case "output":
      return {
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-50 dark:bg-green-900/20",
        icon: Zap,
      }
    case "reasoning":
      return {
        color: "text-purple-600 dark:text-purple-400",
        bg: "bg-purple-50 dark:bg-purple-900/20",
        icon: Brain,
      }
    case "cached":
      return {
        color: "text-orange-600 dark:text-orange-400",
        bg: "bg-orange-50 dark:bg-orange-900/20",
        icon: Database,
      }
    case "total":
      return {
        color: "text-gray-900 dark:text-gray-100",
        bg: "bg-gray-100 dark:bg-gray-800",
        icon: BarChart3,
      }
  }
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Activity className="w-4 h-4" />
          {formatTokenCount(usage.totalTokens)}
          <ChevronRight className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Token Usage Analytics
          </DialogTitle>
          <DialogDescription>
            Comprehensive breakdown of AI token consumption for this
            conversation
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Quick Stats Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Messages
                </span>
              </div>
              <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {usage.messageCount}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                  Total Tokens
                </span>
              </div>
              <span className="text-lg font-bold text-green-900 dark:text-green-100">
                {formatTokenCount(usage.totalTokens)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Detailed Token Breakdown */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Token Breakdown
            </h3>
            <div className="space-y-3">
              {/* Input Tokens */}
              <TokenMetricCard
                type="input"
                label="Input Tokens"
                value={usage.totalInputTokens}
                description="Tokens from your messages and system prompts"
              />

              {/* Output Tokens */}
              <TokenMetricCard
                type="output"
                label="Output Tokens"
                value={usage.totalOutputTokens}
                description="Tokens generated by AI responses"
              />

              {/* Reasoning Tokens */}
              {usage.totalReasoningTokens > 0 && (
                <TokenMetricCard
                  type="reasoning"
                  label="Reasoning Tokens"
                  value={usage.totalReasoningTokens}
                  description="Internal thinking tokens (Claude 4 Sonnet)"
                />
              )}

              {/* Cached Tokens */}
              {usage.totalCachedInputTokens > 0 && (
                <TokenMetricCard
                  type="cached"
                  label="Cached Tokens"
                  value={usage.totalCachedInputTokens}
                  description="Previously processed tokens (cost savings)"
                />
              )}
            </div>
          </div>

          <Separator />

          {/* Model Breakdown Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Model Usage
            </h3>
            <ScrollArea className="h-[350px] rounded-md">
              <div className="space-y-4 pr-3">
                {usage.modelStats.map((modelStat) => (
                  <ModelUsageCard
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
  )
}

// Token Metric Card Component
interface TokenMetricCardProps {
  type: "input" | "output" | "reasoning" | "cached"
  label: string
  value: number
  description: string
}

function TokenMetricCard({
  type,
  label,
  value,
  description,
}: TokenMetricCardProps) {
  const styles = getTokenTypeStyles(type)
  const Icon = styles.icon

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border transition-colors hover:bg-opacity-80 ${styles.bg}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${styles.bg}`}>
          <Icon className={`w-4 h-4 ${styles.color}`} />
        </div>
        <div>
          <div className={`font-medium ${styles.color}`}>{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-lg font-bold ${styles.color}`}>
          {formatTokenCount(value)}
        </div>
        <div className="text-xs text-muted-foreground">
          {value.toLocaleString()} tokens
        </div>
      </div>
    </div>
  )
}

// Model Usage Card Component
interface ModelUsageCardProps {
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

function ModelUsageCard({ model, stats }: ModelUsageCardProps) {
  const displayName = getModelDisplayName(model)
  const isThinking = model.includes("thinking")

  return (
    <div className="p-5 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
            <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {displayName}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              {stats.messageCount} message{stats.messageCount !== 1 ? "s" : ""}
              {isThinking && (
                <Badge variant="secondary" className="text-xs">
                  Thinking Mode
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatTokenCount(stats.totalTokens)}
          </div>
          <div className="text-xs text-muted-foreground">total tokens</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-blue-500" />
            <span className="text-sm font-medium">Input</span>
          </div>
          <span className="font-mono text-sm font-semibold">
            {formatTokenCount(stats.inputTokens)}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border">
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-green-500" />
            <span className="text-sm font-medium">Output</span>
          </div>
          <span className="font-mono text-sm font-semibold">
            {formatTokenCount(stats.outputTokens)}
          </span>
        </div>

        {stats.reasoningTokens > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border">
            <div className="flex items-center gap-2">
              <Brain className="w-3 h-3 text-purple-500" />
              <span className="text-sm font-medium">Reasoning</span>
            </div>
            <span className="font-mono text-sm font-semibold">
              {formatTokenCount(stats.reasoningTokens)}
            </span>
          </div>
        )}

        {stats.cachedInputTokens > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border">
            <div className="flex items-center gap-2">
              <Database className="w-3 h-3 text-orange-500" />
              <span className="text-sm font-medium">Cached</span>
            </div>
            <span className="font-mono text-sm font-semibold">
              {formatTokenCount(stats.cachedInputTokens)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
