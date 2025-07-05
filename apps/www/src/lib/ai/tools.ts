/**
 * AI Tools System - Single source of truth for tool definitions
 *
 * Define a tool once and get:
 * - Type-safe tool instances for AI SDK
 * - Input/output types for TypeScript
 * - Automatic registry management
 */

import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod/v4";

// Single version of a tool
interface ToolVersion<TInput extends z.ZodType, TOutput extends z.ZodType> {
	version: string;
	inputSchema: TInput;
	outputSchema: TOutput;
	execute: (input: z.infer<TInput>) => Promise<z.infer<TOutput>>;
}

// Complete tool definition with multiple versions
interface ToolDefinition<
	TName extends string,
	TVersions extends Record<string, ToolVersion<any, any>>,
> {
	name: TName;
	displayName: string;
	description: string;
	versions: TVersions;
	defaultVersion: keyof TVersions; // Now strictly typed to available versions
}

// Helper to create a tool definition with versions
function defineTool<
	TName extends string,
	TVersions extends Record<string, ToolVersion<any, any>>,
>(def: ToolDefinition<TName, TVersions>) {
	return def;
}

// ============================================
// TOOL DEFINITIONS - Add new tools here
// ============================================

const webSearchTool = defineTool({
	name: "web_search" as const,
	displayName: "Web Search",
	description: "Search the web for information using Exa AI",
	defaultVersion: "2.0.0" as const,
	versions: {
		"1.0.0": {
			version: "1.0.0",
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
		},
		"2.0.0": {
			version: "2.0.0",
			inputSchema: z.object({
				// Completely different structure for v2
				search: z.object({
					text: z.string().describe("The search query text"),
					mode: z.enum(["smart", "exact", "fuzzy"]).default("smart"),
				}),
				filters: z
					.object({
						domains: z
							.array(z.string())
							.optional()
							.describe("List of domains to search"),
						dateRange: z
							.object({
								from: z.string().optional(),
								to: z.string().optional(),
							})
							.optional(),
						excludeTerms: z.array(z.string()).optional(),
					})
					.optional(),
				options: z
					.object({
						limit: z.number().min(1).max(50).default(10),
						includeMetadata: z.boolean().default(true),
						language: z.enum(["en", "es", "fr", "de", "ja"]).optional(),
					})
					.optional(),
			}),
			outputSchema: z.object({
				results: z.array(
					z.object({
						title: z.string(),
						url: z.string(),
						snippet: z.string().optional(),
						score: z.number().optional(),
						publishedDate: z.string().optional(),
						author: z.string().optional(),
						highlights: z.array(z.string()).optional(),
					}),
				),
				query: z.string(),
				autopromptString: z.string().optional(),
				searchType: z.enum(["neural", "keyword"]),
				totalResults: z.number(),
				metadata: z.object({
					searchTime: z.number(),
					version: z.literal("2.0.0"),
				}),
			}),
			execute: async (input) => {
				const API_KEY = process.env.EXA_API_KEY;
				if (!API_KEY) {
					throw new Error("EXA_API_KEY environment variable is not set");
				}

				const startTime = Date.now();

				try {
					const exa = new Exa(API_KEY);

					// Map new v2 input structure to Exa API
					const searchOptions: any = {
						useAutoprompt: input.search.mode === "smart",
						numResults: input.options?.limit || 10,
						type: input.search.mode === "exact" ? "keyword" : "neural",
						includeText: input.options?.includeMetadata ?? true,
					};

					// Handle domain filters differently
					if (input.filters?.domains && input.filters.domains.length > 0) {
						// Exa only supports single domain, so we take the first
						searchOptions.domain = input.filters.domains[0];
					}

					if (input.filters?.dateRange) {
						searchOptions.startCrawlDate = input.filters.dateRange.from;
						searchOptions.endCrawlDate = input.filters.dateRange.to;
					}

					// Build query with exclusions
					let query = input.search.text;
					if (
						input.filters?.excludeTerms &&
						input.filters.excludeTerms.length > 0
					) {
						query += ` ${input.filters.excludeTerms
							.map((term: string) => `-"${term}"`)
							.join(" ")}`;
					}

					const response = await exa.searchAndContents(query, searchOptions);

					return {
						results: response.results.map((result) => ({
							title: result.title || "Untitled",
							url: result.url,
							snippet: result.text || undefined,
							score: result.score || undefined,
							publishedDate: result.publishedDate || undefined,
							author: result.author || undefined,
							highlights: undefined, // Not available in current Exa API
						})),
						query: input.search.text,
						autopromptString: response.autopromptString,
						searchType: input.search.mode === "exact" ? "keyword" : "neural",
						totalResults: response.results.length,
						metadata: {
							searchTime: Date.now() - startTime,
							version: "2.0.0" as const,
						},
					};
				} catch (error) {
					console.error("Web search v2 error:", error);
					throw error;
				}
			},
		},
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

// Helper function to create a tool from a tool definition
function createToolFromDefinition<
	TName extends LightfastToolName,
	TDef extends typeof toolDefinitions[TName]
>(toolDef: TDef) {
	const defaultVersion = toolDef.versions[toolDef.defaultVersion];
	type Input = z.infer<typeof defaultVersion.inputSchema>;
	type Output = z.infer<typeof defaultVersion.outputSchema>;
	
	return tool<Input, Output>({
		description: toolDef.description,
		inputSchema: defaultVersion.inputSchema,
		execute: defaultVersion.execute,
	});
}

// Create AI SDK tools from definitions (using default versions)
export const LIGHTFAST_TOOLS = {
	web_search: createToolFromDefinition(webSearchTool),
	// When adding new tools, just add them here:
	// calculator: createToolFromDefinition(calculatorTool),
	// weather: createToolFromDefinition(weatherTool),
} as const;

// Type exports - everything is inferred!
export type LightfastToolSet = typeof LIGHTFAST_TOOLS;
export type LightfastToolName = keyof typeof toolDefinitions;

// Extract all versions for a tool
export type ToolVersions<T extends LightfastToolName> =
	keyof (typeof toolDefinitions)[T]["versions"] & string;

// Create a map of all valid tool-version combinations
export type ToolVersionMap = {
	[K in LightfastToolName]: ToolVersions<K>;
};

// Export all available tool versions as a runtime value for Convex validators
export const TOOL_VERSIONS = Object.fromEntries(
	Object.entries(toolDefinitions).map(([toolName, toolDef]) => [
		toolName,
		Object.keys(toolDef.versions),
	]),
) as { [K in LightfastToolName]: ToolVersions<K>[] };

// For now, simplify to just use default version schemas
export type LightfastToolSchemas = {
	[K in keyof typeof toolDefinitions]: {
		input: z.infer<
			(typeof toolDefinitions)[K]["versions"][(typeof toolDefinitions)[K]["defaultVersion"]]["inputSchema"]
		>;
		output: z.infer<
			(typeof toolDefinitions)[K]["versions"][(typeof toolDefinitions)[K]["defaultVersion"]]["outputSchema"]
		>;
	};
};

// Get specific tool types (for now, just default version)
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

// Get default version for a tool with preserved literal type
export function getToolDefaultVersion<T extends LightfastToolName>(
	name: T,
): (typeof toolDefinitions)[T]["defaultVersion"] {
	return toolDefinitions[name].defaultVersion;
}

// Get tool metadata with strongly typed return value
export function getToolMetadata<T extends LightfastToolName>(name: T) {
	const def = toolDefinitions[name];
	return {
		name: def.name,
		displayName: def.displayName,
		description: def.description,
		defaultVersion: def.defaultVersion,
		availableVersions: Object.keys(def.versions) as ToolVersions<T>[],
	} as const;
}

// Get tool schemas for a specific version
export function getToolSchemas<T extends LightfastToolName>(
	name: T,
	version?: ToolVersions<T>,
) {
	const def = toolDefinitions[name];
	const v = version || def.defaultVersion;

	// Type-safe access
	if (!(v in def.versions)) {
		throw new Error(`Version ${v} not found for tool ${name}`);
	}

	const versionDef = def.versions[v as keyof typeof def.versions];

	return {
		input: versionDef.inputSchema,
		output: versionDef.outputSchema,
	};
}

// Tool names array
export const TOOL_NAMES = Object.keys(toolDefinitions) as LightfastToolName[];

// Create tool input/output validators types for Convex
// For now, just use default version schemas
export type ToolInputValidators = {
	[K in LightfastToolName]: z.infer<
		(typeof toolDefinitions)[K]["versions"][(typeof toolDefinitions)[K]["defaultVersion"]]["inputSchema"]
	>;
};

export type ToolOutputValidators = {
	[K in LightfastToolName]: z.infer<
		(typeof toolDefinitions)[K]["versions"][(typeof toolDefinitions)[K]["defaultVersion"]]["outputSchema"]
	>;
};
