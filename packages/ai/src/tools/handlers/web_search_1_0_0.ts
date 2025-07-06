import { z } from "zod/v4";
import Exa from "exa-js";
import { defineTool } from "../types";

export const webSearchV1 = defineTool({
	name: "web_search_1_0_0" as const,
	displayName: "Web Search v1",
	description: "Search the web for information using Exa AI (v1.0.0)",
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
	}),
	outputSchema: z.object({
		results: z.array(
			z.object({
				title: z.string(),
				url: z.string(),
				snippet: z.string().optional(),
				score: z.number().optional(),
			}),
		),
		query: z.string(),
		autopromptString: z.string().optional(),
	}),
	execute: async (input) => {
		const API_KEY = process.env.EXA_API_KEY;
		if (!API_KEY) {
			throw new Error("EXA_API_KEY environment variable is not set");
		}

		try {
			const exa = new Exa(API_KEY);

			const response = await exa.searchAndContents(input.query, {
				useAutoprompt: input.useAutoprompt,
				numResults: input.numResults,
				type: "neural",
			});

			return {
				results: response.results.map((result) => ({
					title: result.title || "Untitled",
					url: result.url,
					snippet: result.text || undefined,
					score: result.score || undefined,
				})),
				query: input.query,
				autopromptString: response.autopromptString,
			};
		} catch (error) {
			console.error("Web search error:", error);
			throw error;
		}
	},
});
