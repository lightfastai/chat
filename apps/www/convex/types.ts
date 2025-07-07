import type { LightfastToolName } from "@lightfast/ai/tools";
import type { Infer } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type {
	addErrorPartArgsValidator,
	addFilePartArgsValidator,
	addRawPartArgsValidator,
	addReasoningPartArgsValidator,
	addSourceDocumentPartArgsValidator,
	addSourceUrlPartArgsValidator,
	addTextPartArgsValidator,
	addToolCallArgsValidator,
	addToolCallPartArgsValidator,
	addToolInputStartArgsValidator,
	addToolInputStartPartArgsValidator,
	addToolResultArgsValidator,
	addToolResultPartArgsValidator,
	errorDetailsValidator,
	errorPartValidator,
	filePartValidator,
	messagePartValidator,
	messageStatusValidator,
	reasoningPartValidator,
	roleValidator,
	sourceDocumentPartValidator,
	sourceUrlPartValidator,
	textPartValidator,
	tokenUsageValidator,
	toolCallPartValidator,
	toolInputStartPartValidator,
	toolNameValidator,
	toolResultPartValidator,
	userApiKeysValidator,
} from "./validators";

export type DbThread = Doc<"threads">;
export type DbMessage = Doc<"messages">;
export type DbUser = Doc<"users">;
export type DbFile = Doc<"files">;
export type DbFeedback = Doc<"feedback">;
export type DbUserSettings = Doc<"userSettings">;
export type DbShareAccess = Doc<"shareAccess">;

export type DbMessagePart = Infer<typeof messagePartValidator>;
export type DbTextPart = Infer<typeof textPartValidator>;
export type DbToolCallPart = Infer<typeof toolCallPartValidator>;
export type DbToolInputStartPart = Infer<typeof toolInputStartPartValidator>;
export type DbToolResultPart = Infer<typeof toolResultPartValidator>;
export type DbReasoningPart = Infer<typeof reasoningPartValidator>;
export type DbErrorPart = Infer<typeof errorPartValidator>;
export type DbSourceUrlPart = Infer<typeof sourceUrlPartValidator>;
export type DbSourceDocumentPart = Infer<typeof sourceDocumentPartValidator>;
export type DbFilePart = Infer<typeof filePartValidator>;
export type DbMessageRole = Infer<typeof roleValidator>;
export type DbToolName = Infer<typeof toolNameValidator>;
export type UserApiKeys = Infer<typeof userApiKeysValidator>;

// Tool argument types
export type AddToolCallArgs = Infer<typeof addToolCallArgsValidator>;
export type AddToolInputStartArgs = Infer<
	typeof addToolInputStartArgsValidator
>;
export type AddToolResultArgs = Infer<typeof addToolResultArgsValidator>;

// Other types
export type ErrorDetails = Infer<typeof errorDetailsValidator>;
export type MessageStatus = Infer<typeof messageStatusValidator>;
export type TokenUsage = NonNullable<Infer<typeof tokenUsageValidator>>;

// Derived type that extracts all possible message part type literals
export type MessagePartType = DbMessagePart["type"];

// ===== Mutation Argument Types =====
// These types are inferred from the validators for mutation arguments

export type AddTextPartArgs = Infer<typeof addTextPartArgsValidator>;
export type AddReasoningPartArgs = Infer<typeof addReasoningPartArgsValidator>;
export type AddRawPartArgs = Infer<typeof addRawPartArgsValidator>;
export type AddErrorPartArgs = Infer<typeof addErrorPartArgsValidator>;
export type AddToolInputStartPartArgs = Infer<
	typeof addToolInputStartPartArgsValidator
>;
export type AddToolCallPartArgs = Infer<typeof addToolCallPartArgsValidator>;
export type AddToolResultPartArgs = Infer<
	typeof addToolResultPartArgsValidator
>;
export type AddSourceUrlPartArgs = Infer<typeof addSourceUrlPartArgsValidator>;
export type AddSourceDocumentPartArgs = Infer<
	typeof addSourceDocumentPartArgsValidator
>;
export type AddFilePartArgs = Infer<typeof addFilePartArgsValidator>;

export type DbToolInputForName<T extends LightfastToolName> = Extract<
	DbToolCallPart["args"],
	{ toolName: T }
>["input"];

export type DbToolOutputForName<T extends LightfastToolName> = Extract<
	DbToolResultPart["args"],
	{ toolName: T }
>["output"];

// Helper type to get tool call/result parts with proper typing
export type TypedToolCallPart<T extends LightfastToolName> = Omit<
	DbToolCallPart,
	"args"
> & {
	args: Extract<DbToolCallPart["args"], { toolName: T }>;
};

export type TypedToolResultPart<T extends LightfastToolName> = Omit<
	DbToolResultPart,
	"args"
> & {
	args: Extract<DbToolResultPart["args"], { toolName: T }>;
};

export function isTextPart(part: DbMessagePart): part is DbTextPart {
	return part.type === "text";
}

export function isToolCallPart(part: DbMessagePart): part is DbToolCallPart {
	return part.type === "tool-call";
}

export function isToolInputStartPart(
	part: DbMessagePart,
): part is DbToolInputStartPart {
	return part.type === "tool-input-start";
}

export function isToolResultPart(
	part: DbMessagePart,
): part is DbToolResultPart {
	return part.type === "tool-result";
}

export function isReasoningPart(part: DbMessagePart): part is DbReasoningPart {
	return part.type === "reasoning";
}

export function isErrorPart(part: DbMessagePart): part is DbErrorPart {
	return part.type === "error";
}

export function isSourceUrlPart(part: DbMessagePart): part is DbSourceUrlPart {
	return part.type === "source-url";
}

export function isSourceDocumentPart(
	part: DbMessagePart,
): part is DbSourceDocumentPart {
	return part.type === "source-document";
}

export function isFilePart(part: DbMessagePart): part is DbFilePart {
	return part.type === "file";
}

// Type guards for specific tools
export function isWebSearchToolCall(
	part: DbMessagePart,
): part is TypedToolCallPart<"web_search_1_0_0"> {
	return isToolCallPart(part) && part.args.toolName === "web_search_1_0_0";
}

export function isWebSearchToolResult(
	part: DbMessagePart,
): part is TypedToolResultPart<"web_search_1_0_0"> {
	return isToolResultPart(part) && part.args.toolName === "web_search_1_0_0";
}

// Version-specific helper functions
export function isWebSearchV1ToolCall(
	part: DbMessagePart,
): part is TypedToolCallPart<"web_search_1_0_0"> {
	return isToolCallPart(part) && part.args.toolName === "web_search_1_0_0";
}

export function isWebSearchV1ToolResult(
	part: DbMessagePart,
): part is TypedToolResultPart<"web_search_1_0_0"> {
	return isToolResultPart(part) && part.args.toolName === "web_search_1_0_0";
}

// Generic helper to check if tool name is any version of web search
export function isWebSearchTool(toolName: string): boolean {
	return toolName.startsWith("web_search_");
}

// ===== Utility Functions =====
/**
 * Extract text content from a message part
 */

export function getPartText(part: DbMessagePart): string | null {
	if (isTextPart(part)) return part.text;
	if (isReasoningPart(part)) return part.text;
	if (isErrorPart(part)) return part.errorMessage;
	return null;
}
/**
 * Check if a part contains streamable content
 */

export function isStreamablePart(part: DbMessagePart): boolean {
	return (
		isTextPart(part) ||
		isReasoningPart(part) ||
		isToolCallPart(part) ||
		isToolInputStartPart(part) ||
		isToolResultPart(part)
	);
}

/**
 * Get tool name from any tool-related part
 */
export function getToolName(part: DbMessagePart): LightfastToolName | null {
	if (
		isToolCallPart(part) ||
		isToolInputStartPart(part) ||
		isToolResultPart(part)
	) {
		return part.args.toolName;
	}
	return null;
}
