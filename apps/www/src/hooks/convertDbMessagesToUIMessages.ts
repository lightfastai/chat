"use client";
import type { Doc } from "../../convex/_generated/dataModel";
import type { DbMessagePart } from "../../convex/types";
import type { UIMessage } from "../types/schema";

export function convertDbMessagesToUIMessages(
	dbMessages: Doc<"messages">[],
): UIMessage[] {
	return dbMessages.map((msg) => ({
		id: msg._id,
		role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
		parts: (msg.parts || []).map((part: DbMessagePart) => {
			if (part.type === "text") {
				return {
					type: "text",
					text: part.text,
				};
			}

			if (part.type === "reasoning") {
				return {
					type: "reasoning",
					text: part.text,
				};
			}
		}) as UIMessage["parts"],
	}));
}
