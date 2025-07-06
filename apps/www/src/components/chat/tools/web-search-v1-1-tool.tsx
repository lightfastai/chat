"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@lightfast/ui/components/ui/accordion";
import { Alert, AlertDescription } from "@lightfast/ui/components/ui/alert";
import { Badge } from "@lightfast/ui/components/ui/badge";
import {
	AlertCircle,
	ExternalLink,
	Globe,
	Loader2,
	Sparkles,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import type {
	DbErrorPart,
	DbToolCallPart,
	DbToolInputStartPart,
	DbToolResultPart,
} from "../../../../convex/types";
import {
	type LightfastToolInput,
	type LightfastToolOutput,
	getToolMetadata,
} from "../../../lib/ai/tools";

// Type-safe input/output types for web_search_1_1_0
type WebSearchV1_1Input = LightfastToolInput<"web_search_1_1_0">;
type WebSearchV1_1Output = LightfastToolOutput<"web_search_1_1_0">;

export interface WebSearchV1_1ToolProps {
	toolCall: DbToolCallPart | DbToolInputStartPart | DbToolResultPart;
	error?: DbErrorPart;
}

export const WebSearchV1_1Tool = memo(function WebSearchV1_1Tool({
	toolCall,
	error,
}: WebSearchV1_1ToolProps) {
	const metadata = getToolMetadata("web_search_1_1_0");

	// Determine state based on part type
	const state = (() => {
		if (error) return "error";
		switch (toolCall.type) {
			case "tool-input-start":
				return "input-streaming";
			case "tool-call":
				return "input-available";
			case "tool-result":
				return "output-available";
			default:
				return "unknown";
		}
	})();

	// Extract data based on part type
	const input =
		"input" in toolCall.args
			? (toolCall.args.input as WebSearchV1_1Input | undefined)
			: undefined;
	const searchQuery = input?.query;
	const contentType = input?.contentType || "highlights";

	// Get output if available
	const output =
		"output" in toolCall.args
			? (toolCall.args.output as WebSearchV1_1Output)
			: undefined;
	const results = output?.results;
	const resultCount = results?.length || 0;
	const tokensEstimate = output?.tokensEstimate;

	const accordionValue = `web-search-v1-1-${toolCall.toolCallId}`;

	// Handle different states
	if (state === "input-streaming") {
		return (
			<div className="my-2 border rounded-lg px-4 py-3 bg-muted/30">
				<div className="flex items-center gap-2">
					<Sparkles className="h-4 w-4 animate-pulse text-blue-500" />
					<div className="text-sm">
						<div className="font-medium text-muted-foreground">
							Preparing {metadata.displayName}...
						</div>
						{searchQuery && (
							<p className="text-xs text-muted-foreground/70 mt-1">
								Query: "{searchQuery}"
							</p>
						)}
					</div>
				</div>
			</div>
		);
	}

	if (state === "error") {
		return (
			<div className="my-2">
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						<div className="font-medium">{metadata.displayName} failed</div>
						{searchQuery && (
							<p className="text-xs mt-1 opacity-80">Query: "{searchQuery}"</p>
						)}
						<p className="text-xs mt-2">
							{error?.errorMessage || "An error occurred while searching"}
						</p>
						{error?.errorDetails?.errorType && (
							<p className="text-xs mt-1 font-mono opacity-70">
								Error: {error.errorDetails.errorType}
							</p>
						)}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	// Helper to format content type display
	const getContentTypeLabel = (type: string) => {
		switch (type) {
			case "highlights":
				return "Highlights";
			case "summary":
				return "Summary";
			case "text":
				return "Text";
			default:
				return type;
		}
	};

	// Helper to format tokens
	const formatTokens = (tokens: number) => {
		if (tokens < 1000) return `${tokens} tokens`;
		return `${(tokens / 1000).toFixed(1)}k tokens`;
	};

	return (
		<div className="my-6 border rounded-lg">
			<Accordion type="single" collapsible className="w-full">
				<AccordionItem value={accordionValue}>
					<AccordionTrigger className="py-3 px-4 hover:no-underline data-[state=closed]:hover:bg-muted/50 items-center">
						<div className="flex items-center gap-2 flex-1">
							{state === "input-available" ? (
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
							) : (
								<Globe className="h-4 w-4 text-muted-foreground" />
							)}
							<div className="text-left flex-1">
								<div className="font-medium text-xs lowercase text-muted-foreground">
									{state === "input-available" ? "searching..." : searchQuery}
								</div>
							</div>
							{state === "output-available" && (
								<div className="flex items-center gap-2">
									<Badge
										variant="secondary"
										className="text-xs px-2 py-0 h-5 font-normal"
									>
										{getContentTypeLabel(contentType)}
									</Badge>
									{tokensEstimate && (
										<div className="flex items-center gap-1 text-xs text-muted-foreground/70">
											<Zap className="h-3 w-3" />
											<span>{formatTokens(tokensEstimate)}</span>
										</div>
									)}
									<span className="text-xs text-muted-foreground/70">
										{resultCount} results
									</span>
								</div>
							)}
						</div>
					</AccordionTrigger>
					<AccordionContent className="px-4">
						{state === "input-available" ? (
							<div className="pt-3">
								<div className="group flex items-center gap-3 rounded-lg p-2 px-3">
									<Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
									<span className="text-xs font-medium text-muted-foreground flex-1">
										Searching for relevant information...
									</span>
								</div>
							</div>
						) : results && results.length > 0 ? (
							<div className="pt-3">
								{results.map((result, index) => (
									<div
										key={`${toolCall.toolCallId}-v1-1-result-${index}`}
										className="mb-3 last:mb-0"
									>
										<Link
											href={result.url}
											target="_blank"
											rel="noopener noreferrer"
											className="group block hover:bg-muted/50 rounded-sm p-3"
										>
											<div className="flex items-start justify-between gap-3 mb-1">
												<h4 className="text-xs font-medium text-foreground flex-1">
													{result.title}
												</h4>
												<div className="flex items-center gap-2 shrink-0">
													<span className="text-xs text-muted-foreground/70">
														{new URL(result.url).hostname}
													</span>
													<ExternalLink className="h-3 w-3 text-muted-foreground/50" />
												</div>
											</div>
											{result.content && (
												<p className="text-xs text-muted-foreground line-clamp-3 mt-1">
													{result.content}
												</p>
											)}
										</Link>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground py-2">
								No results found.
							</p>
						)}
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
});
