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
  Calendar,
  Clock,
  ExternalLink,
  Filter,
  Globe,
  Hash,
  Loader2, Sparkles,
  User,
  Zap
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

// Type-safe input/output types for web_search_2_0_0
type WebSearchV2Input = LightfastToolInput<"web_search_2_0_0">;
type WebSearchV2Output = LightfastToolOutput<"web_search_2_0_0">;

export interface WebSearchV2ToolProps {
	toolCall: DbToolCallPart | DbToolInputStartPart | DbToolResultPart;
	error?: DbErrorPart;
}

export function WebSearchV2Tool({ toolCall, error }: WebSearchV2ToolProps) {
	const metadata = getToolMetadata("web_search_2_0_0");

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
		? toolCall.args.input as WebSearchV2Input | undefined
		: undefined;
	const searchText = input?.search.text;
	const searchMode = input?.search.mode || "smart";
	const filters = input?.filters;
	const options = input?.options;

	// Get output if available
	const output =
		"output" in toolCall.args
			? (toolCall.args.output as WebSearchV2Output)
			: undefined;
	const results = output?.results;
	const resultCount = results?.length || 0;
	const totalResults = output?.totalResults || 0;
	const searchType = output?.searchType;
	const searchMetadata = output?.metadata;
	const autopromptString = output?.autopromptString;

	const accordionValue = `web-search-v2-${toolCall.toolCallId}`;

	// Handle different states
	if (state === "input-streaming") {
		return (
			<div className="my-2 border rounded-lg px-4 py-3 bg-muted/30">
				<div className="flex items-center gap-2">
					<Sparkles className="h-4 w-4 animate-pulse text-purple-500" />
					<div className="text-sm">
						<div className="font-medium text-muted-foreground">
							Preparing {metadata.displayName}...
						</div>
						{searchText && (
							<p className="text-xs text-muted-foreground/70 mt-1">
								Query: "{searchText}"
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
						{searchText && (
							<p className="text-xs mt-1 opacity-80">Query: "{searchText}"</p>
						)}
						<p className="text-xs mt-2">
							{error?.errorMessage || "An error occurred during advanced search"}
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
		<div className="my-2 border rounded-lg px-4 py-1 border-purple-200 dark:border-purple-900">
			<Accordion type="single" collapsible className="w-full">
				<AccordionItem value={accordionValue}>
					<AccordionTrigger>
						<div className="flex items-center gap-2">
							{state === "input-available" ? (
								<Loader2 className="h-4 w-4 animate-spin text-purple-600" />
							) : (
								<Zap className="h-4 w-4 text-purple-600" />
							)}
							<div className="text-left">
								<div className="font-medium flex items-center gap-2">
									{state === "input-available"
										? `Advanced searching with ${metadata.displayName}...`
										: `${metadata.displayName} Results`}
									{state === "output-available" && (
										<Badge variant="secondary" className="text-xs">
											{resultCount}
											{totalResults > resultCount ? ` of ${totalResults}` : ""}{" "}
											results
										</Badge>
									)}
								</div>
								{searchText && (
									<p className="text-xs text-muted-foreground mt-1">
										Query: "{searchText}"
										<span className="ml-2 text-purple-600">
											Mode: {searchMode}
										</span>
									</p>
								)}
								{autopromptString && autopromptString !== searchText && (
									<p className="text-xs text-muted-foreground/60 italic mt-0.5">
										Enhanced: "{autopromptString}"
									</p>
								)}
								<div className="flex flex-wrap gap-2 mt-1">
									{filters?.domains && filters.domains.length > 0 && (
										<Badge variant="outline" className="text-xs">
											<Globe className="h-3 w-3 mr-1" />
											{filters.domains.join(", ")}
										</Badge>
									)}
									{filters?.dateRange && (
										<Badge variant="outline" className="text-xs">
											<Calendar className="h-3 w-3 mr-1" />
											{filters.dateRange.from || "Any"} -{" "}
											{filters.dateRange.to || "Now"}
										</Badge>
									)}
									{options?.language && (
										<Badge variant="outline" className="text-xs">
											Language: {options.language}
										</Badge>
									)}
									{searchType && (
										<Badge
											variant="outline"
											className="text-xs text-purple-600"
										>
											{searchType} search
										</Badge>
									)}
									{searchMetadata && (
										<Badge variant="outline" className="text-xs">
											<Clock className="h-3 w-3 mr-1" />
											{searchMetadata.searchTime}ms
										</Badge>
									)}
								</div>
							</div>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						{state === "input-available" ? (
							<div className="text-sm text-muted-foreground py-2">
								<div className="flex items-center gap-2">
									<Loader2 className="h-3 w-3 animate-spin" />
									Performing advanced search...
								</div>
								{filters && (
									<div className="mt-2 space-y-1 text-xs">
										{filters.excludeTerms &&
											filters.excludeTerms.length > 0 && (
												<div className="flex items-center gap-1">
													<Filter className="h-3 w-3" />
													Excluding: {filters.excludeTerms.join(", ")}
												</div>
											)}
										{options?.includeMetadata && (
											<div className="flex items-center gap-1">
												<Hash className="h-3 w-3" />
												Including metadata
											</div>
										)}
									</div>
								)}
							</div>
						) : results && results.length > 0 ? (
							<div className="divide-y">
								{results.map((result, index) => (
									<div
										key={`${toolCall.toolCallId}-v2-result-${index}`}
										className="py-3 first:pt-0 last:pb-0"
									>
										<a
											href={result.url}
											target="_blank"
											rel="noopener noreferrer"
											className="group flex items-start gap-2"
										>
											<div className="flex-1">
												<h4 className="text-sm font-medium text-purple-600 group-hover:underline dark:text-purple-400">
													{result.title}
												</h4>
												{result.snippet && (
													<p className="mt-1 text-xs text-muted-foreground line-clamp-2">
														{result.snippet}
													</p>
												)}
												{result.highlights && result.highlights.length > 0 && (
													<div className="mt-1 space-y-0.5">
														{result.highlights
															.slice(0, 2)
															.map((highlight, hIndex) => (
																<p
																	key={hIndex}
																	className="text-xs text-purple-600/60 italic"
																>
																	"...{highlight}..."
																</p>
															))}
													</div>
												)}
												<div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground/70">
													<span className="flex items-center gap-1">
														<Globe className="h-3 w-3" />
														{new URL(result.url).hostname}
													</span>
													{result.publishedDate && (
														<span className="flex items-center gap-1">
															<Calendar className="h-3 w-3" />
															{new Date(
																result.publishedDate,
															).toLocaleDateString()}
														</span>
													)}
													{result.author && (
														<span className="flex items-center gap-1">
															<User className="h-3 w-3" />
															{result.author}
														</span>
													)}
													{result.score !== undefined && (
														<span className="flex items-center gap-1">
															<Hash className="h-3 w-3" />
															{result.score.toFixed(2)}
														</span>
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
