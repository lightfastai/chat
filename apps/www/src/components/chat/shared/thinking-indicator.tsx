"use client";

import { ChevronDown } from "lucide-react";
import { ThinkingAnimation } from "./thinking-animation";

interface ThinkingIndicatorProps {
	label?: string;
	showChevron?: boolean;
	onChevronClick?: () => void;
}

export function ThinkingIndicator({
	label = "Thinking",
	showChevron = false,
	onChevronClick,
}: ThinkingIndicatorProps) {
	return (
		<div className="inline-flex items-center gap-2">
			{/* Memoized thinking animation */}
			<ThinkingAnimation />

			{/* Text */}
			<span className="text-xs text-muted-foreground">{label}</span>

			{/* Chevron for reasoning models */}
			{showChevron && (
				<button
					type="button"
					onClick={onChevronClick}
					className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronDown className="h-3 w-3" />
				</button>
			)}
		</div>
	);
}
