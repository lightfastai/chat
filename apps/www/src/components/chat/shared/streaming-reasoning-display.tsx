"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { ThinkingIndicator } from "./thinking-indicator";

interface StreamingReasoningDisplayProps {
	isStreaming: boolean;
	isComplete: boolean;
	hasContent: boolean;
	reasoningContent?: string;
	isReasoningModel: boolean;
}

export function StreamingReasoningDisplay({
	isStreaming,
	isComplete,
	hasContent,
	reasoningContent,
	isReasoningModel,
}: StreamingReasoningDisplayProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	// Only show when streaming with no main content yet
	if (!isStreaming || isComplete || hasContent) {
		return null;
	}

	// For non-reasoning models, just show the thinking indicator
	if (!isReasoningModel) {
		return (
			<div className="mb-2 flex items-center gap-2 min-h-5">
				<ThinkingIndicator label="Thinking" />
			</div>
		);
	}

	// For reasoning models, show expandable reasoning display
	return (
		<div className="mb-4">
			<div className="flex items-center gap-2 min-h-5">
				<ThinkingIndicator label="Reasoning" />
				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className="text-muted-foreground hover:text-foreground transition-colors"
				>
					{isExpanded ? (
						<ChevronDown className="h-3 w-3" />
					) : (
						<ChevronRight className="h-3 w-3" />
					)}
				</button>
			</div>

			{/* Expanded reasoning content */}
			{isExpanded && reasoningContent && (
				<div className="mt-3 pl-5 text-xs text-muted-foreground">
					<p className="whitespace-pre-wrap font-mono leading-relaxed">
						{reasoningContent}
					</p>
				</div>
			)}
		</div>
	);
}
