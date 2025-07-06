/**
 * AI Tools Registry - Automatic collection and export of all tool definitions
 *
 * This file automatically imports all tools from the impl directory
 * and creates the necessary exports for type-safe tool usage.
 */

import { tool } from "ai";
import type { z } from "zod/v4";

// Import all tool implementations
import { webSearchV1 } from "./handlers/web_search_1_0_0";
import { webSearchV1_1 } from "./handlers/web_search_1_1_0";

// Collect all tool definitions
export const toolDefinitions = {
	web_search_1_0_0: webSearchV1,
	web_search_1_1_0: webSearchV1_1,
	// Add new tools here as they are created
	// calculator_1_0_0: calculatorV1,
	// weather_1_0_0: weatherV1,
} as const;

// Create AI SDK tool instances
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
	// Add new tool instances here
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
