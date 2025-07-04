/**
 * Tool Registry - Central registry for all AI tools
 * 
 * This file imports tool definitions from individual tool files and
 * creates a unified registry for type safety and validation.
 */

import { v, type Infer } from "convex/values";

// Import tool definitions
import {
	WEB_SEARCH_TOOL_NAME,
	webSearchSchemas,
	webSearchValidators,
	webSearchMetadata,
	type WebSearchInput,
	type WebSearchOutput,
} from "./web-search";

// Tool names as const for type safety
export const TOOL_NAMES = [WEB_SEARCH_TOOL_NAME] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

// Tool Registry - Single source of truth
export const TOOL_REGISTRY = {
	[WEB_SEARCH_TOOL_NAME]: {
		name: WEB_SEARCH_TOOL_NAME,
		displayName: webSearchMetadata.displayName,
		description: webSearchMetadata.description,
		schemas: webSearchSchemas,
		validators: webSearchValidators,
	},
} as const;

// Type exports for each tool
export type ToolSchemas = {
	[WEB_SEARCH_TOOL_NAME]: {
		input: WebSearchInput;
		output: WebSearchOutput;
	};
};

// Convex validator types
export type ToolInputValidators = {
	[WEB_SEARCH_TOOL_NAME]: Infer<typeof webSearchValidators.input>;
};

export type ToolOutputValidators = {
	[WEB_SEARCH_TOOL_NAME]: Infer<typeof webSearchValidators.output>;
};

// Union validators for database storage
export const toolNameValidator = v.union(
	...TOOL_NAMES.map((name) => v.literal(name)),
);

// Dynamic tool input/output validators
export const toolInputValidator = v.union(
	v.object({
		toolName: v.literal(WEB_SEARCH_TOOL_NAME),
		input: webSearchValidators.input,
	}),
	// Add more tools here as they're created
);

export const toolOutputValidator = v.union(
	v.object({
		toolName: v.literal(WEB_SEARCH_TOOL_NAME),
		output: webSearchValidators.output,
	}),
	// Add more tools here as they're created
);

// Helper function to get tool validator
export function getToolValidator(toolName: ToolName) {
	return TOOL_REGISTRY[toolName].validators;
}

// Helper function to get tool schema
export function getToolSchema(toolName: ToolName) {
	return TOOL_REGISTRY[toolName].schemas;
}

// Type guards
export function isValidToolName(name: string): name is ToolName {
	return TOOL_NAMES.includes(name as ToolName);
}

// Export types for UI
export type LightfastUITools = ToolSchemas;