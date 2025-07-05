"use client";

import { ChevronDown, ChevronRight, Loader2, Wrench } from "lucide-react";
import { useState } from "react";
import type { DbToolCallPart } from "../../../../convex/types";

export interface GenericToolDisplayProps {
	toolCall: DbToolCallPart;
}

export function GenericToolDisplay({ toolCall }: GenericToolDisplayProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const getStatusIcon = () => {
		// TODO: Add state field to database schema
		// For now, check if we have output to determine if tool has completed
		if ("output" in toolCall && toolCall.output) {
			return <Wrench className="h-4 w-4 text-green-500" />;
		}
		return <Loader2 className="h-4 w-4 animate-spin" />;
	};

	const getStatusText = () => {
		// TODO: Add state field to database schema
		// For now, check if we have output to determine if tool has completed
		if ("output" in toolCall.args && toolCall.args.output) {
			return `${toolCall.args.toolName} completed`;
		}
		return `Calling ${toolCall.args.toolName}...`;
	};

	return (
		<div className="my-2 rounded-lg border border-border bg-muted/50 p-3">
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex w-full items-center justify-between text-left"
			>
				<div className="flex items-center gap-2">
					{getStatusIcon()}
					<span className="text-sm font-medium">{getStatusText()}</span>
				</div>
				{isExpanded ? (
					<ChevronDown className="h-4 w-4" />
				) : (
					<ChevronRight className="h-4 w-4" />
				)}
			</button>

			{isExpanded && (
				<div className="mt-3 space-y-2">
					{toolCall.args.input && (
						<div>
							<p className="text-xs font-medium text-muted-foreground">
								Arguments:
							</p>
							<pre className="mt-1 overflow-auto rounded bg-background p-2 text-xs">
								{JSON.stringify(toolCall.args.input, null, 2)}
							</pre>
						</div>
					)}

					{"output" in toolCall.args && toolCall.args.output !== undefined && (
						<div>
							<p className="text-xs font-medium text-muted-foreground">
								Result:
							</p>
							<pre className="mt-1 overflow-auto rounded bg-background p-2 text-xs">
								{JSON.stringify(toolCall.args.output, null, 2)}
							</pre>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
