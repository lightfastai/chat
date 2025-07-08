"use client";

import { Button } from "@lightfast/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@lightfast/ui/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@lightfast/ui/components/ui/dropdown-menu";
import { type Preloaded, usePreloadedQuery, useQuery } from "convex/react";
import { Activity, MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface TokenUsageDialogProps {
	threadId: Id<"threads"> | "new";
	preloadedThreadUsage?: Preloaded<typeof api.messages.getThreadUsage>;
}

// Helper function to format token counts
function formatTokenCount(count: number): string {
	if (count === 0) return "0";
	if (count < 1000) return count.toLocaleString();
	if (count < 1000000) {
		const k = count / 1000;
		return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
	}
	const m = count / 1000000;
	return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
}

export function TokenUsageDialog({
	threadId,
	preloadedThreadUsage,
}: TokenUsageDialogProps) {
	const [dialogOpen, setDialogOpen] = useState(false);

	// Use preloaded usage data if available
	const preloadedUsage = preloadedThreadUsage
		? usePreloadedQuery(preloadedThreadUsage)
		: null;

	// Check if this is an optimistic thread ID (not a real Convex ID)
	const isOptimisticThreadId = threadId !== "new" && !threadId.startsWith("k");

	// Skip query for new chats, optimistic IDs, or if we have preloaded data
	const usage =
		preloadedUsage ??
		useQuery(
			api.messages.getThreadUsage,
			threadId === "new" || isOptimisticThreadId || preloadedUsage
				? "skip"
				: { threadId },
		);

	// For new chats, show nothing
	if (threadId === "new") {
		return null;
	}

	// If no usage data yet, show nothing
	if (!usage) {
		return null;
	}

	// Note: Cost calculation would require per-model breakdown
	// Since we simplified to aggregate usage only, cost estimation is not available

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
									Messages
								</div>
								<div className="font-mono text-lg font-semibold">
									{usage.messageCount}
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
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

// Token Row Component
interface TokenRowProps {
	label: string;
	value: number;
}

function TokenRow({ label, value }: TokenRowProps) {
	return (
		<div className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="font-mono text-sm font-medium">
				{formatTokenCount(value)}
			</span>
		</div>
	);
}
