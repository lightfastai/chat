"use client";

import type { ToolCallPart } from "@/lib/message-parts";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@lightfast/ui/components/ui/accordion";
import { ExternalLink, Loader2, Search } from "lucide-react";

export interface WebSearchToolProps {
	toolCall: ToolCallPart;
}

interface SearchResult {
	title: string;
	url: string;
	snippet?: string;
	score?: number;
}

export function WebSearchTool({ toolCall }: WebSearchToolProps) {
	const isLoading =
		toolCall.state === "partial-call" || toolCall.state === "call";
	const searchQuery = toolCall.args?.query as string | undefined;

	// Extract search results from the tool result
	const searchResults = toolCall.result?.results as SearchResult[] | undefined;

	const resultCount = searchResults?.length || 0;
	const accordionValue = `search-${toolCall.toolCallId}`;

	return (
		<div className="my-2 border rounded-lg px-4 py-1">
			<Accordion type="single" collapsible className="w-full">
				<AccordionItem value={accordionValue}>
					<AccordionTrigger>
						<div className="flex items-center gap-2">
							{isLoading ? (
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
							) : (
								<Search className="h-4 w-4 text-muted-foreground" />
							)}
							<div className="text-left">
								<div className="font-medium">
									{isLoading
										? "Searching the web..."
										: `Web Search Results (${resultCount})`}
								</div>
								{searchQuery && (
									<p className="text-xs text-muted-foreground mt-1">
										Query: "{searchQuery}"
									</p>
								)}
							</div>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						{searchResults && searchResults.length > 0 && (
							<div className="divide-y">
								{searchResults.map((result, index) => {
									if (!result) return null;
									return (
										<div key={index} className="py-3 first:pt-0 last:pb-0">
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
													<p className="mt-1 text-xs text-muted-foreground/70">
														{new URL(result.url).hostname}
													</p>
												</div>
												<ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/50" />
											</a>
										</div>
									);
								})}
							</div>
						)}

						{searchResults && searchResults.length === 0 && (
							<p className="text-sm text-muted-foreground">No results found.</p>
						)}
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
