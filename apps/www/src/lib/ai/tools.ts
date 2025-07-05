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
interface ToolVersion<
	TInput extends z.ZodType,
	TOutput extends z.ZodType,
> {
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
	defaultVersion: "1.0.0",
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

// Create AI SDK tools from definitions (using default versions)
export const LIGHTFAST_TOOLS = {
	web_search: tool({
		description: webSearchTool.description,
		inputSchema: webSearchTool.versions[webSearchTool.defaultVersion].inputSchema,
		execute: async (input) => {
			// The input should already have defaults applied by Zod
			return webSearchTool.versions[webSearchTool.defaultVersion].execute(input);
		},
	}),
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
	])
) as { [K in LightfastToolName]: ToolVersions<K>[] };

// For now, simplify to just use default version schemas
export type LightfastToolSchemas = {
	[K in keyof typeof toolDefinitions]: {
		input: z.infer<(typeof toolDefinitions)[K]["versions"][(typeof toolDefinitions)[K]["defaultVersion"]]["inputSchema"]>;
		output: z.infer<(typeof toolDefinitions)[K]["versions"][(typeof toolDefinitions)[K]["defaultVersion"]]["outputSchema"]>;
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

// Get default version for a tool
export function getDefaultToolVersion(name: LightfastToolName): string {
	return toolDefinitions[name].defaultVersion as string;
}

// Get tool metadata
export function getToolMetadata(name: LightfastToolName) {
	const def = toolDefinitions[name];
	return {
		name: def.name,
		displayName: def.displayName,
		description: def.description,
		defaultVersion: def.defaultVersion as string,
		availableVersions: Object.keys(def.versions),
	};
}

// Get tool schemas for a specific version
export function getToolSchemas(
	name: LightfastToolName,
	version?: string
) {
	const def = toolDefinitions[name];
	const v = version || def.defaultVersion;

	// Use type assertion since we know the structure
	const versionDef = (def.versions as any)[v];

	if (!versionDef) {
		throw new Error(`Version ${v} not found for tool ${name}`);
	}

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
