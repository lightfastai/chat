"use client";
import type { LightfastToolSchemas } from "@/lib/ai/tools";
import type { UIMessage, UIMessagePart } from "ai";
import type { Doc } from "../../convex/_generated/dataModel";
import type { DbErrorPart, DbMessagePart } from "../../convex/types";

// Define custom data types for error parts
type LightfastUICustomDataTypes = {
	error: Omit<DbErrorPart, "type">;
};

// Use both custom data types and tools
type LightfastUIMessage = UIMessage<
	unknown,
	LightfastUICustomDataTypes,
	LightfastToolSchemas
>;

type LightfastUIMessagePart = UIMessagePart<
	LightfastUICustomDataTypes,
	LightfastToolSchemas
>;

export function convertDbMessagesToUIMessages(
	dbMessages: Doc<"messages">[],
): LightfastUIMessage[] {
	return dbMessages.map((msg) => ({
		id: msg._id,
		role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
		createdAt: new Date(msg._creationTime),
		parts: (msg.parts || [])
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
							input: part.args.input as any, // Type safety is enforced at the database level
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
							input: part.args.input as any, // Type safety is enforced at the database level
							output: part.args.output as any, // Type safety is enforced at the database level
						};

					case "source-url":
						return {
							type: "source-url",
							sourceId: part.sourceId,
							url: part.url,
							title: part.title,
							providerMetadata: part.providerMetadata,
						};

					case "source-document":
						return {
							type: "source-document",
							sourceId: part.sourceId,
							mediaType: part.mediaType,
							title: part.title,
							filename: part.filename,
							providerMetadata: part.providerMetadata,
						};

					case "file":
						return {
							type: "file",
							mediaType: part.mediaType,
							filename: part.filename,
							url: part.url,
						};

					default:
						// Handle any unknown part types
						console.warn(`Unknown message part type: ${(part as any).type}`);
						return null;
				}
			})
			.filter((part): part is LightfastUIMessagePart => part !== null),
	}));
}
