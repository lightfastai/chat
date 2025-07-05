import type { Infer } from "convex/values";
import type { LightfastToolName } from "../src/lib/ai/tools";
import type { Doc } from "./_generated/dataModel";
import type {
  errorPartValidator,
  filePartValidator,
  messagePartValidator,
  reasoningPartValidator,
  roleValidator,
  sourceDocumentPartValidator,
  sourceUrlPartValidator,
  textPartValidator,
  toolCallPartValidator,
  toolInputStartPartValidator,
  toolNameValidator,
  toolResultPartValidator,
} from "./validators";

export type DbMessage = Doc<"messages">;
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

// Extract specific tool input/output types from the discriminated unions
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
): part is TypedToolCallPart<"web_search"> {
	return isToolCallPart(part) && part.args.toolName === "web_search";
}

export function isWebSearchToolResult(
	part: DbMessagePart,
): part is TypedToolResultPart<"web_search"> {
	return isToolResultPart(part) && part.args.toolName === "web_search";
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
