"use client";
import type { ModelId } from "@lightfast/ai/providers";
import type {
	LightfastToolName,
	LightfastToolSchemas,
} from "@lightfast/ai/tools";
import type { UIMessage, UIMessagePart } from "ai";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type {
	DbErrorPart,
	DbMessagePart,
	DbToolCallPart,
	DbToolResultPart,
} from "../../convex/types";

export type LightfastUIMessageOptions = {
	message: string;
	modelId: ModelId;
	options: LightfastUIMessageSendOptions;
};

export type LightfastUIMessageSendOptions = {
	webSearchEnabled: boolean;
	attachments: Id<"files">[];
};

// Define custom data types for error parts
type LightfastUICustomDataTypes = {
	error: Omit<DbErrorPart, "type">;
};

interface LightfastUICustomMetadata {
	dbId: string;
}

// Use both custom data types and tools
export type LightfastUIMessage = UIMessage<
	LightfastUICustomMetadata,
	LightfastUICustomDataTypes,
	LightfastToolSchemas
>;

export type LightfastUIMessagePart = UIMessagePart<
	LightfastUICustomDataTypes,
	LightfastToolSchemas
>;

/**
 * Generate a stable key for a UI message part based on its content
 */
export function getPartKey(
	part: LightfastUIMessagePart,
	index: number,
): string {
	// Handle text-based parts
	if (part.type === "text" || part.type === "reasoning") {
		return `${part.type}-${index}-${part.text}`;
	}

	// Handle tool parts generically
	if (
		part.type.startsWith("tool-") &&
		"toolCallId" in part &&
		"state" in part
	) {
		return `${part.type}-${part.toolCallId}-${part.state}`;
	}

	// Handle other known part types
	if (part.type === "data-error") {
		return `error-${index}`;
	}

	if (part.type === "source-url" && "sourceId" in part) {
		return `source-url-${part.sourceId}`;
	}

	if (part.type === "source-document" && "sourceId" in part) {
		return `source-doc-${part.sourceId}`;
	}

	if (part.type === "file" && "url" in part) {
		return `file-${index}-${part.url}`;
	}

	// Fallback for unknown types
	return `unknown-${index}`;
}

/**
 * Type-safe tool part converter that handles all tool types generically
 */
function convertToolPartToDb(
	part: Extract<LightfastUIMessagePart, { type: `tool-${string}` }>,
	timestamp: number,
): DbMessagePart | null {
	// Extract the tool name from the part type
	const toolName = part.type.replace(/^tool-/, "") as LightfastToolName;

	switch (part.state) {
		case "input-streaming":
		case "input-available":
			return {
				type: "tool-call",
				args: {
					toolName,
					// TypeScript knows the input type matches the tool schema
					input: part.input,
				} as DbToolCallPart["args"],
				toolCallId: part.toolCallId,
				timestamp,
			};
		case "output-available":
			return {
				type: "tool-result",
				args: {
					toolName,
					input: part.input,
					output: part.output,
				} as DbToolResultPart["args"],
				toolCallId: part.toolCallId,
				timestamp,
			};
		default:
			return null;
	}
}

/**
 * Convert a single UI message part to a DB message part with provided timestamp
 */
export function convertUIPartToDbPart(
	part: LightfastUIMessagePart,
	timestamp: number,
): DbMessagePart | null {
	// Handle text-based parts
	if (part.type === "text") {
		return {
			type: "text",
			text: part.text,
			timestamp,
		};
	}

	if (part.type === "reasoning") {
		return {
			type: "reasoning",
			text: part.text,
			timestamp,
		};
	}

	// Handle tool parts generically
	if (
		part.type.startsWith("tool-") &&
		"toolCallId" in part &&
		"state" in part
	) {
		return convertToolPartToDb(
			part as Extract<LightfastUIMessagePart, { type: `tool-${string}` }>,
			timestamp,
		);
	}

	// Other part types not supported in DB conversion
	return null;
}

export const convertUIMessageToDbParts = (
	uiMessage: LightfastUIMessage,
): DbMessagePart[] => {
	const now = Date.now();
	return uiMessage.parts
		.map((part, index): DbMessagePart | null => {
			return convertUIPartToDbPart(part, now + index);
		})
		.filter((part): part is DbMessagePart => part !== null);
};

export function convertDbMessagesToUIMessages(
	dbMessages: Doc<"messages">[],
): LightfastUIMessage[] {
	return dbMessages.map((msg) => {
		// Convert parts array to UI format
		const parts: LightfastUIMessagePart[] = (msg.parts || [])
				.map((part: DbMessagePart): LightfastUIMessagePart | null => {
					switch (part.type) {
						case "text":
							return {
								type: "text",
								text: part.text,
							};

						case "reasoning":
							return {
								type: "reasoning",
								text: part.text,
							};

						case "error":
							return {
								type: "data-error",
								data: {
									errorMessage: part.errorMessage,
									errorDetails: part.errorDetails,
									timestamp: part.timestamp,
								},
							};

						case "tool-call":
							// Map to the AI SDK's tool part format with proper type
							// The type assertion is safe because we validate tool names in the database
							return {
								type: `tool-${part.args.toolName}` as keyof LightfastToolSchemas extends `tool-${infer T}`
									? `tool-${T}`
									: never,
								toolCallId: part.toolCallId,
								state: "input-available" as const,
								input: part.args.input,
							};

						case "tool-input-start":
							return null; // Skip input-start parts for UI

						case "tool-result":
							// Map to the AI SDK's tool part format with output
							// The type assertion is safe because we validate tool names in the database
							return {
								type: `tool-${part.args.toolName}` as keyof LightfastToolSchemas extends `tool-${infer T}`
									? `tool-${T}`
									: never,
								toolCallId: part.toolCallId,
								state: "output-available" as const,
								input: part.args.input,
								output: part.args.output,
							};

						case "source-url":
							return {
								type: "source-url",
								sourceId: part.sourceId,
								url: part.url,
								title: part.title,
							};

						case "source-document":
							return {
								type: "source-document",
								sourceId: part.sourceId,
								mediaType: part.mediaType,
								title: part.title,
								filename: part.filename,
							};

						case "file":
							return {
								type: "file",
								mediaType: part.mediaType,
								filename: part.filename,
								url: part.url,
							};

						case "raw":
							// Raw parts are for debugging and shouldn't appear in UI
							return null;

						default: {
							// Handle any unknown part types
							const exhaustiveCheck: never = part;
							console.warn(
								`Unknown message part type: ${(exhaustiveCheck as DbMessagePart).type}`,
							);
							return null;
						}
					}
				})
				.filter((part): part is LightfastUIMessagePart => part !== null);

		return {
			id: msg._id,
			role: (msg.role || "assistant") === "user" ? ("user" as const) : ("assistant" as const),
			createdAt: new Date(msg._creationTime || msg.timestamp || Date.now()),
			parts,
		};
	});
}
