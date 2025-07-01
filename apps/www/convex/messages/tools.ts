import { tool } from "ai";
import Exa, {
	type RegularSearchOptions,
	type ContentsOptions,
	type SearchResult,
} from "exa-js";
import { z } from "zod";
import { env } from "../env.js";

/**
 * Creates a web search tool using the AI SDK v5 pattern
 * This tool enables AI models to search the web for current information
 */
export function createWebSearchTool() {
	return tool({
		description:
			"Search the web for current information, news, and real-time data. Use this proactively when you need up-to-date information beyond your knowledge cutoff. After receiving search results, you must immediately analyze and explain the findings without waiting for additional prompting.",
		inputSchema: z.object({
			query: z
				.string()
				.describe("The search query to find relevant web results"),
		}),
		execute: async ({ query }) => {
			console.log(`Executing web search for: "${query}"`);

			const exaApiKey = env.EXA_API_KEY;

			try {
				const exa = new Exa(exaApiKey);
				const numResults = 5;
				const searchOptions: RegularSearchOptions & ContentsOptions = {
					numResults,
					text: {
						maxCharacters: 2000, // Increased for more comprehensive content
						includeHtmlTags: false,
					},
					highlights: {
						numSentences: 5, // More highlights for better understanding
						highlightsPerUrl: 4,
					},
				};

				const response = await exa.searchAndContents(query, searchOptions);

				const results = response.results.map((result) => ({
					id: result.id,
					url: result.url,
					title: result.title || "",
					text: result.text,
					highlights: (
						result as SearchResult<ContentsOptions> & { highlights?: string[] }
					).highlights,
					publishedDate: result.publishedDate,
					author: result.author,
					score: result.score,
				}));

				console.log(`Web search found ${results.length} results`);

				// Return structured data that helps the AI understand and explain
				return {
					success: true,
					query,
					searchIntent: `Web search for: "${query}"`,
					resultCount: results.length,
					results: results.map((r, idx) => ({
						...r,
						relevanceRank: idx + 1,
						// Provide full text content, not just summary
						fullText: r.text || "No content available",
						summary: r.text
							? r.text.length > 300
								? `${r.text.slice(0, 300)}...`
								: r.text
							: "No preview available",
						// Include all highlights for comprehensive understanding
						keyPoints: r.highlights || [],
					})),
					searchMetadata: {
						timestamp: new Date().toISOString(),
						autoprompt: response.autopromptString,
					},
					instructions:
						"Analyze these search results thoroughly and provide a comprehensive explanation of the findings.",
				};
			} catch (error) {
				console.error("Web search error:", error);
				return {
					success: false,
					query,
					error: error instanceof Error ? error.message : "Unknown error",
					results: [],
					resultCount: 0,
				};
			}
		},
	});
}
