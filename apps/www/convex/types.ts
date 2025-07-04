import type { Infer } from "convex/values";
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
} from "./validators";

export type DbMessage = Doc<"messages">;
export type DbMessagePart = Infer<typeof messagePartValidator>;
export type DbTextPart = Infer<typeof textPartValidator>;
export type DbToolCallPart = Infer<typeof toolCallPartValidator>;
export type DbReasoningPart = Infer<typeof reasoningPartValidator>;
export type DbErrorPart = Infer<typeof errorPartValidator>;
export type DbSourceUrlPart = Infer<typeof sourceUrlPartValidator>;
export type DbSourceDocumentPart = Infer<typeof sourceDocumentPartValidator>;
export type DbFilePart = Infer<typeof filePartValidator>;
export type DbMessageRole = Infer<typeof roleValidator>;

export function isTextPart(part: DbMessagePart): part is DbTextPart {
	return part.type === "text";
}

export function isToolCallPart(part: DbMessagePart): part is DbToolCallPart {
	return part.type === "tool-call";
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

export function isToolCallInProgress(part: DbMessagePart): boolean {
	return isToolCallPart(part) && part.state === "partial-call";
}

export function isToolCallComplete(part: DbMessagePart): boolean {
	return isToolCallPart(part) && part.state === "call";
}

export function isToolCallWithResult(part: DbMessagePart): boolean {
	return isToolCallPart(part) && part.state === "result";
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
	return isTextPart(part) || isReasoningPart(part) || isToolCallPart(part);
}
