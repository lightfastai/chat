/**
 * AI Tools System - Single source of truth for tool definitions
 *
 * Define a tool once and get:
 * - Type-safe tool instances for AI SDK
 * - Input/output types for TypeScript
 * - Automatic registry management
 *
 * Tool naming convention: <tool-name>_<semantic-version>
 * This eliminates version management complexity
 */

import { tool } from "ai";
import Exa, {
	type RegularSearchOptions,
	type SearchResponse,
} from "exa-js";
import { z } from "zod/v4";

// Tool name must follow pattern: <tool-name>_<semantic-version>
// Using string pattern since version numbers are string literals in identifiers
type ToolNamePattern = `${string}_${string}_${string}_${string}`;

// Simplified tool definition - each version is a separate tool
interface ToolDefinition<
	TName extends ToolNamePattern,
	TInput extends z.ZodType,
	TOutput extends z.ZodType,
> {
	name: TName;
	displayName: string;
	description: string;
	inputSchema: TInput;
	outputSchema: TOutput;
	execute: (input: z.infer<TInput>) => Promise<z.infer<TOutput>>;
}

// Helper to create a tool definition
function defineTool<
	TName extends ToolNamePattern,
	TInput extends z.ZodType,
	TOutput extends z.ZodType,
>(def: ToolDefinition<TName, TInput, TOutput>) {
	return def;
}

// ============================================
// TOOL DEFINITIONS - Add new tools here
// ============================================

// Each version is now a separate tool with semantic versioning in the name
const webSearchV1 = defineTool({
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

// Web Search v1.1.0 - Optimized for reduced token usage with highlights and summaries
const webSearchV1_1 = defineTool({
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

// Add more tools here as needed
// const calculatorV1 = defineTool({ name: "calculator_1.0.0", ... });
// const weatherV1 = defineTool({ name: "weather_1.0.0", ... });

// ============================================
// AUTOMATIC TYPE INFERENCE AND REGISTRY
// ============================================

// Collect all tool definitions
const toolDefinitions = {
	web_search_1_0_0: webSearchV1,
	web_search_1_1_0: webSearchV1_1,
	// calculator_1_0_0: calculatorV1,
	// weather_1_0_0: weatherV1,
} as const;

// Helper function to create a tool from a tool definition
export const LIGHTFAST_TOOLS = {
	web_search_1_0_0: tool({
		description: webSearchV1.description,
		inputSchema: webSearchV1.inputSchema,
		execute: webSearchV1.execute,
	}),
	web_search_1_1_0: tool({
		description: webSearchV1_1.description,
		inputSchema: webSearchV1_1.inputSchema,
		execute: webSearchV1_1.execute,
	}),
	// calculator_1_0_0: createToolFromDefinition(calculatorV1),
	// weather_1_0_0: createToolFromDefinition(weatherV1),
} as const;

// Type exports - everything is inferred!
export type LightfastToolSet = typeof LIGHTFAST_TOOLS;
export type LightfastToolName = keyof typeof toolDefinitions;

// Simplified schema extraction - each tool is self-contained
export type LightfastToolSchemas = {
	[K in keyof typeof toolDefinitions]: {
		input: z.infer<(typeof toolDefinitions)[K]["inputSchema"]>;
		output: z.infer<(typeof toolDefinitions)[K]["outputSchema"]>;
	};
};

// Get specific tool types
export type LightfastToolInput<T extends LightfastToolName> =
	LightfastToolSchemas[T]["input"];

export type LightfastToolOutput<T extends LightfastToolName> =
	LightfastToolSchemas[T]["output"];

// Runtime helpers
export function isLightfastToolName(name: string): name is LightfastToolName {
	return name in toolDefinitions;
}

export function validateToolName(name: string): LightfastToolName {
	if (isLightfastToolName(name)) {
		return name;
	}
	throw new Error(`Invalid tool name: ${name}`);
}

// Get tool metadata
export function getToolMetadata<T extends LightfastToolName>(name: T) {
	const def = toolDefinitions[name];
	return {
		name: def.name,
		displayName: def.displayName,
		description: def.description,
	} as const;
}

// Get tool schemas
export function getToolSchemas<T extends LightfastToolName>(name: T) {
	const def = toolDefinitions[name];
	return {
		input: def.inputSchema,
		output: def.outputSchema,
	};
}

// Tool names array
export const TOOL_NAMES = Object.keys(toolDefinitions) as LightfastToolName[];

// Simplified types for Convex
export type ToolInputValidators = {
	[K in LightfastToolName]: z.infer<(typeof toolDefinitions)[K]["inputSchema"]>;
};

export type ToolOutputValidators = {
	[K in LightfastToolName]: z.infer<
		(typeof toolDefinitions)[K]["outputSchema"]
	>;
};
