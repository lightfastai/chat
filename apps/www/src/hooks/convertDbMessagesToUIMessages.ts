"use client";
import type { UIMessage, UIMessagePart, UITools } from "ai";
import type { Doc } from "../../convex/_generated/dataModel";
import type { DbMessagePart, DbErrorPart } from "../../convex/types";

type LightfastUICustomDataTypes = {
	error: Omit<DbErrorPart, "type">;
};

type LightfastUIMessage = UIMessage<
	unknown,
	LightfastUICustomDataTypes,
	UITools
>;

type LightfastUIMessagePart = UIMessagePart<
	LightfastUICustomDataTypes,
	UITools
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
						return {
							type: "tool-call",
							toolCallId: part.toolCallId,
							toolName: part.toolName,
							input: part.input,
						};

					case "tool-input-start":
						return null; // Skip input-start parts for UI

					case "tool-result":
						return {
							type: "tool-result",
							toolCallId: part.toolCallId,
							toolName: part.toolName,
							input: part.input,
							output: part.output,
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
