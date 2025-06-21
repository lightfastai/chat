"use client";

import { getModelDisplayName as getModelName } from "@/lib/ai";
import { Badge } from "@lightfast/ui/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@lightfast/ui/components/ui/tooltip";
import { useQuery } from "convex/react";
import { Activity, Brain } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface TokenUsageHeaderProps {
	threadId: Id<"threads"> | "new";
}

// Helper function to format token counts
function formatTokenCount(count: number): string {
	if (count === 0) return "0";
	if (count < 1000) return count.toString();
	if (count < 1000000) {
		const k = count / 1000;
		return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
	}
	const m = count / 1000000;
	return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
}

// Helper function to get model display name
function getModelDisplayName(model: string): string {
	// Handle legacy provider names
	if (model === "anthropic") return "Claude 3.5 Sonnet";
	if (model === "openai") return "GPT-4o Mini";

	// Use the centralized model name lookup
	return getModelName(model);
}

export function TokenUsageHeader({ threadId }: TokenUsageHeaderProps) {
	// Check if this is an optimistic thread ID (not a real Convex ID)
	const isOptimisticThreadId = threadId !== "new" && !threadId.startsWith("k");

	// Skip query for new chats or optimistic IDs
	const usage = useQuery(
		api.messages.getThreadUsage,
		threadId === "new" || isOptimisticThreadId ? "skip" : { threadId },
	);

	// For new chats, show nothing
	if (threadId === "new") {
		return null;
	}

	// If no usage data yet, show nothing (loading state handled by Suspense)
	if (!usage) {
		return null;
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
	);
}
