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
import Exa from "exa-js";
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

// Add more tools here as needed
// const calculatorV1 = defineTool({ name: "calculator_1.0.0", ... });
// const weatherV1 = defineTool({ name: "weather_1.0.0", ... });

// ============================================
// AUTOMATIC TYPE INFERENCE AND REGISTRY
// ============================================

// Collect all tool definitions
const toolDefinitions = {
	web_search_1_0_0: webSearchV1,
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
