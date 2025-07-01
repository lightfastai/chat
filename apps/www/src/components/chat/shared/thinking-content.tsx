"use client";

import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

export interface ThinkingContentProps {
	content: string;
	duration?: number | null;
	isExpanded?: boolean;
	onToggle?: (expanded: boolean) => void;
	isReasoningModel?: boolean;
	isStreaming?: boolean;
}

// Helper function to format duration
export function formatDuration(ms: number) {
	if (ms < 1000) {
		return `${Math.round(ms)}ms`;
	}
	if (ms < 60000) {
		return `${(ms / 1000).toFixed(1)}s`;
	}
	const minutes = Math.floor(ms / 60000);
	const seconds = Math.floor((ms % 60000) / 1000);
	return `${minutes}m ${seconds}s`;
}

export function ThinkingContent({
	content,
	duration,
	isExpanded: controlledExpanded,
	onToggle,
	isReasoningModel = false,
	isStreaming = false,
}: ThinkingContentProps) {
	const [localExpanded, setLocalExpanded] = useState(false);

	// Use controlled state if provided, otherwise use local state
	const isExpanded =
		controlledExpanded !== undefined ? controlledExpanded : localExpanded;

	const handleToggle = (newExpanded: boolean) => {
		if (onToggle) {
			onToggle(newExpanded);
		} else {
			setLocalExpanded(newExpanded);
		}
	};

	return (
		<div className="mb-4">
			<button
				type="button"
				onClick={() => handleToggle(!isExpanded)}
				className="flex w-full items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
			>
				{isExpanded ? (
					<ChevronDown className="h-3 w-3" />
				) : (
					<ChevronRight className="h-3 w-3" />
				)}
				<Brain className="h-3 w-3" />
				<span>
					{isReasoningModel
						? "View reasoning process"
						: "View thinking process"}
				</span>
				{isStreaming ? (
					<span className="ml-auto font-mono text-[10px] animate-pulse">
						thinking...
					</span>
				) : (
					duration && (
						<span className="ml-auto font-mono text-[10px]">
							{formatDuration(duration)}
						</span>
					)
				)}
			</button>
			{isExpanded && (
				<div className="mt-3 pl-5 text-xs text-muted-foreground space-y-2">
					<p className="whitespace-pre-wrap font-mono leading-relaxed">
						{content}
						{isStreaming && (
							<span className="inline-block w-2 h-3 bg-current animate-pulse ml-1 opacity-70" />
						)}
					</p>
				</div>
			)}
		</div>
	);
}
