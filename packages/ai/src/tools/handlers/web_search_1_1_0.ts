import { z } from "zod/v4";
import Exa, { type RegularSearchOptions, type SearchResponse } from "exa-js";
import { defineTool } from "../types";

export const webSearchV1_1 = defineTool({
	name: "web_search_1_1_0" as const,
	displayName: "Web Search v1.1",
	description:
		"Search the web with optimized content retrieval using highlights and summaries (v1.1.0)",
	inputSchema: z.object({
		query: z.string().describe("The search query"),
		useAutoprompt: z
			.boolean()
			.default(true)
			.describe("Whether to enhance the query automatically"),
		numResults: z
			.number()
			.min(1)
			.max(10)
			.default(5)
			.describe("Number of results to return"),
		contentType: z
			.enum(["highlights", "summary", "text"])
			.default("highlights")
			.describe(
				"Type of content to retrieve: highlights (excerpts), summary (AI-generated), or text (full)",
			),
		maxCharacters: z
			.number()
			.min(100)
			.max(5000)
			.default(2000)
			.describe("Maximum characters per result when using text content type"),
		summaryQuery: z
			.string()
			.optional()
			.describe(
				"Custom query for generating summaries (only used with summary content type)",
			),
		includeDomains: z
			.array(z.string())
			.optional()
			.describe("Domains to include in search results"),
		excludeDomains: z
			.array(z.string())
			.optional()
			.describe("Domains to exclude from search results"),
	}),
	outputSchema: z.object({
		results: z.array(
			z.object({
				title: z.string(),
				url: z.string(),
				content: z
					.string()
					.describe("The retrieved content based on contentType"),
				contentType: z.enum(["highlights", "summary", "text"]),
				score: z.number().optional(),
			}),
		),
		query: z.string(),
		autopromptString: z.string().optional(),
		tokensEstimate: z
			.number()
			.describe("Estimated tokens used for content retrieval"),
	}),
	execute: async (input) => {
		const API_KEY = process.env.EXA_API_KEY;
		if (!API_KEY) {
			throw new Error("EXA_API_KEY environment variable is not set");
		}

		try {
			const exa = new Exa(API_KEY);

			// Build search options with proper typing
			const baseOptions: RegularSearchOptions = {
				useAutoprompt: input.useAutoprompt,
				numResults: input.numResults,
				type: "auto", // Use auto to let Exa choose between neural/keyword
			};

			// Add domain filters if provided
			if (input.includeDomains) {
				baseOptions.includeDomains = input.includeDomains;
			}
			if (input.excludeDomains) {
				baseOptions.excludeDomains = input.excludeDomains;
			}

			// Configure content retrieval based on contentType with proper typing
			type HighlightsResponse = SearchResponse<{ highlights: true }>;
			type SummaryResponse = SearchResponse<{ summary: { query: string } }>;
			type TextResponse = SearchResponse<{ text: { maxCharacters: number } }>;

			let response: HighlightsResponse | SummaryResponse | TextResponse;
			switch (input.contentType) {
				case "highlights": {
					const searchOptions = {
						...baseOptions,
						highlights: true,
					} as const;
					response = await exa.searchAndContents(input.query, searchOptions);
					break;
				}
				case "summary": {
					const searchOptions = {
						...baseOptions,
						summary: {
							query: input.summaryQuery || input.query,
						},
					} as const;
					response = await exa.searchAndContents(input.query, searchOptions);
					break;
				}
				case "text": {
					const searchOptions = {
						...baseOptions,
						text: {
							maxCharacters: input.maxCharacters,
						},
					} as const;
					response = await exa.searchAndContents(input.query, searchOptions);
					break;
				}
			}

			// Calculate estimated tokens (rough estimate: 1 token ≈ 4 characters)
			let totalCharacters = 0;
			const results = response.results.map((result) => {
				let content = "";

				// Extract content based on what was returned - now properly typed
				if (input.contentType === "highlights" && "highlights" in result) {
					content = result.highlights.join(" ... ");
				} else if (input.contentType === "summary" && "summary" in result) {
					content = result.summary;
				} else if ("text" in result) {
					content = result.text;
				}

				totalCharacters += content.length;

				return {
					title: result.title || "Untitled",
					url: result.url,
					content,
					contentType: input.contentType,
					score: result.score || undefined,
				};
			});

			return {
				results,
				query: input.query,
				autopromptString: response.autopromptString,
				tokensEstimate: Math.ceil(totalCharacters / 4),
			};
		} catch (error) {
			console.error("Web search error:", error);
			throw error;
		}
	},
});
