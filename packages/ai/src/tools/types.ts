import type { z } from "zod/v4";

// Tool name must follow pattern: <tool-name>_<semantic-version>
// Using string pattern since version numbers are string literals in identifiers
export type ToolNamePattern = `${string}_${string}_${string}_${string}`;

// Simplified tool definition - each version is a separate tool
export interface ToolDefinition<
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
export function defineTool<
	TName extends ToolNamePattern,
	TInput extends z.ZodType,
	TOutput extends z.ZodType,
>(def: ToolDefinition<TName, TInput, TOutput>) {
	return def;
}
