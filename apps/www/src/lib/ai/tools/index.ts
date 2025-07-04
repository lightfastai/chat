/**
 * AI Tools System - Single source of truth for tool definitions
 *
 * Define a tool once and get:
 * - Type-safe tool instances for AI SDK
 * - Input/output types for TypeScript
 * - Automatic registry management
 */

import { tool as createAITool } from "ai";
import { z } from "zod";

// Base tool definition interface
interface ToolDefinition<
	TName extends string,
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
	TName extends string,
	TInput extends z.ZodType,
	TOutput extends z.ZodType,
>(def: ToolDefinition<TName, TInput, TOutput>) {
	return def;
}

// ============================================
// TOOL DEFINITIONS - Add new tools here
// ============================================

const webSearchTool = defineTool({
	name: "web_search" as const,
	displayName: "Web Search",
	description: "Search the web for information using Exa AI",
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
		enhancedQuery: z.string().optional(),
	}),
	execute: async (input) => {
		const API_KEY = process.env.EXA_API_KEY;
		if (!API_KEY) {
			throw new Error("EXA_API_KEY environment variable is not set");
		}

		try {
			const response = await fetch("https://api.exa.ai/search", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${API_KEY}`,
				},
				body: JSON.stringify({
					query: input.query,
					useAutoprompt: input.useAutoprompt,
					numResults: input.numResults,
					type: "neural",
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Exa API error: ${response.status} - ${errorText}`);
			}

			const data = await response.json();

			// Define the expected result type from Exa API
			interface ExaResult {
				title: string;
				url: string;
				snippet?: string;
				score?: number;
			}

			return {
				results: data.results.map((result: ExaResult) => ({
					title: result.title,
					url: result.url,
					snippet: result.snippet,
					score: result.score,
				})),
				query: input.query,
				enhancedQuery: data.autopromptString,
			};
		} catch (error) {
			console.error("Web search error:", error);
			throw error;
		}
	},
});

// Add more tools here as needed
// const calculatorTool = defineTool({ ... });
// const weatherTool = defineTool({ ... });

// ============================================
// AUTOMATIC TYPE INFERENCE AND REGISTRY
// ============================================

// Collect all tool definitions
const toolDefinitions = {
	web_search: webSearchTool,
	// calculator: calculatorTool,
	// weather: weatherTool,
} as const;

// Create AI SDK tools from definitions
// For beta version of AI SDK, we need to pass the schemas as type parameters
export const LIGHTFAST_TOOLS = {
	web_search: createAITool({
		description: webSearchTool.description,
		inputSchema: webSearchTool.inputSchema as z.ZodSchema<{
			query: string;
			useAutoprompt: boolean;
			numResults: number;
		}>,
		execute: webSearchTool.execute,
	}),
} as const;

// Type exports - everything is inferred!
export type LightfastToolSet = typeof LIGHTFAST_TOOLS;
export type LightfastToolName = keyof typeof toolDefinitions;

// Tool schemas type - for UI components
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
export function getToolMetadata(name: LightfastToolName) {
	const def = toolDefinitions[name];
	return {
		name: def.name,
		displayName: def.displayName,
		description: def.description,
	};
}

// Get tool schemas (for validation elsewhere)
export function getToolSchemas(name: LightfastToolName) {
	const def = toolDefinitions[name];
	return {
		input: def.inputSchema,
		output: def.outputSchema,
	};
}

// Tool names array
export const TOOL_NAMES = Object.keys(toolDefinitions) as LightfastToolName[];

// Create tool input/output validators types for Convex
// Map tool names to their schemas for type inference
export type ToolInputValidators = {
	[K in LightfastToolName]: z.infer<(typeof toolDefinitions)[K]["inputSchema"]>;
};

export type ToolOutputValidators = {
	[K in LightfastToolName]: z.infer<
		(typeof toolDefinitions)[K]["outputSchema"]
	>;
};
