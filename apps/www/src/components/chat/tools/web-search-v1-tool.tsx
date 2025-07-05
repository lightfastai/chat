"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@lightfast/ui/components/ui/accordion";
import { Alert, AlertDescription } from "@lightfast/ui/components/ui/alert";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
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

// Type-safe input/output types for web_search_1_0_0
type WebSearchV1Input = LightfastToolInput<"web_search_1_0_0">;
type WebSearchV1Output = LightfastToolOutput<"web_search_1_0_0">;

export interface WebSearchV1ToolProps {
	toolCall: DbToolCallPart | DbToolInputStartPart | DbToolResultPart;
	error?: DbErrorPart;
}

export function WebSearchV1Tool({ toolCall, error }: WebSearchV1ToolProps) {
	const metadata = getToolMetadata("web_search_1_0_0");

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
	const input = "input" in toolCall.args
		? toolCall.args.input as WebSearchV1Input | undefined
		: undefined;
	const searchQuery = input?.query;
	const useAutoprompt = input?.useAutoprompt ?? true;
	const numResults = input?.numResults ?? 5;

	// Get output if available
	const output =
		"output" in toolCall.args
			? (toolCall.args.output as WebSearchV1Output)
			: undefined;
	const results = output?.results;
	const resultCount = results?.length || 0;
	const autopromptString = output?.autopromptString;

	const accordionValue = `web-search-v1-${toolCall.toolCallId}`;

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

	return (
		<div className="my-2 border rounded-lg px-4 py-1">
			<Accordion type="single" collapsible className="w-full">
				<AccordionItem value={accordionValue}>
					<AccordionTrigger>
						<div className="flex items-center gap-2">
							{state === "input-available" ? (
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
							) : (
								<Search className="h-4 w-4 text-muted-foreground" />
							)}
							<div className="text-left">
								<div className="font-medium">
									{state === "input-available"
										? `Searching with ${metadata.displayName}...`
										: `${metadata.displayName} Results (${resultCount})`}
								</div>
								{searchQuery && (
									<p className="text-xs text-muted-foreground mt-1">
										Query: "{searchQuery}"
										{useAutoprompt && <> • Autoprompt enabled</>}
										{numResults !== 5 && <> • {numResults} results</>}
									</p>
								)}
								{autopromptString && autopromptString !== searchQuery && (
									<p className="text-xs text-muted-foreground/60 italic">
										Enhanced: "{autopromptString}"
									</p>
								)}
							</div>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						{state === "input-available" ? (
							<div className="text-sm text-muted-foreground py-2">
								<div className="flex items-center gap-2">
									<Loader2 className="h-3 w-3 animate-spin" />
									Searching for relevant information...
								</div>
							</div>
						) : results && results.length > 0 ? (
							<div className="divide-y">
								{results.map((result, index) => (
									<div
										key={`${toolCall.toolCallId}-v1-result-${index}`}
										className="py-3 first:pt-0 last:pb-0"
									>
										<a
											href={result.url}
											target="_blank"
											rel="noopener noreferrer"
											className="group flex items-start gap-2"
										>
											<div className="flex-1">
												<h4 className="text-sm font-medium text-blue-600 group-hover:underline dark:text-blue-400">
													{result.title}
												</h4>
												{result.snippet && (
													<p className="mt-1 text-xs text-muted-foreground line-clamp-2">
														{result.snippet}
													</p>
												)}
												<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/70">
													<span>{new URL(result.url).hostname}</span>
													{result.score !== undefined && (
														<>
															<span>•</span>
															<span>Score: {result.score.toFixed(2)}</span>
														</>
													)}
												</div>
											</div>
											<ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/50" />
										</a>
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
}
