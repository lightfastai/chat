"use client";
import type { LightfastToolSchemas } from "@/lib/ai/tools";
import type { UIMessage, UIMessagePart } from "ai";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { DbErrorPart, DbMessagePart } from "../../convex/types";
import type { ModelId } from "../lib/ai";

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

export const convertUIMessageToDbParts = (
	uiMessage: LightfastUIMessage,
): DbMessagePart[] => {
	return uiMessage.parts
		.map((part): DbMessagePart | null => {
			switch (part.type) {
				case "text":
					return {
						type: "text",
						text: part.text,
						timestamp: Date.now(),
					};
				case "reasoning":
					return {
						type: "reasoning",
						text: part.text,
						timestamp: Date.now(),
					};
				case "tool-web_search_1_0_0":
					switch (part.state) {
						case "input-streaming":
						case "input-available":
							return {
								type: "tool-call",
								args: {
									toolName: "web_search_1_0_0",
									input: part.input as any,
								},
								toolCallId: part.toolCallId,
								timestamp: Date.now(),
							};
						case "output-available":
							return {
								type: "tool-result",
								args: {
									toolName: "web_search_1_0_0",
									input: part.input,
									output: part.output,
								},
								toolCallId: part.toolCallId,
								timestamp: Date.now(),
							};
						default:
							return null;
					}
				case "tool-web_search_2_0_0":
					switch (part.state) {
						case "input-streaming":
						case "input-available":
							return {
								type: "tool-call",
								args: {
									toolName: "web_search_2_0_0",
									input: part.input as any,
								},
								toolCallId: part.toolCallId,
								timestamp: Date.now(),
							};
						case "output-available":
							return {
								type: "tool-result",
								args: {
									toolName: "web_search_2_0_0",
									input: part.input,
									output: part.output,
								},
								toolCallId: part.toolCallId,
								timestamp: Date.now(),
							};
						default:
							return null;
					}
				default:
					return null;
			}
		})
		.filter((part): part is DbMessagePart => part !== null);
};

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
