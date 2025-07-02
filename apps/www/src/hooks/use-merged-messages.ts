import type { Doc } from "@/convex/_generated/dataModel";
import type { MessagePart } from "@/convex/validators";
import type { UIMessage } from "@ai-sdk/react";
import { useMemo } from "react";

/**
 * Helper to merge consecutive text and reasoning parts into single text parts.
 * This is used to consolidate message content for display.
 */
export function mergeTextParts(parts: MessagePart[]): MessagePart[] {
	const merged: MessagePart[] = [];
	let currentText = "";

	for (const part of parts) {
		if (part.type === "text" || part.type === "reasoning") {
			// Accumulate text from text and reasoning parts
			currentText += part.text;
		} else {
			// Flush accumulated text before adding non-text part
			if (currentText) {
				merged.push({
					type: "text",
					text: currentText,
				});
				currentText = "";
			}
			merged.push(part);
		}
	}

	// Don't forget remaining text
	if (currentText) {
		merged.push({
			type: "text",
			text: currentText,
		});
	}

	return merged;
}

/**
 * Hook that merges Convex database messages with Vercel streaming messages.
 *
 * The key insight: We always return Convex messages, but when a message is actively
 * streaming from Vercel, we replace its parts with the Vercel streaming parts.
 *
 * @param convexMessages - Messages from Convex database
 * @param vercelMessages - Messages from Vercel AI SDK (for streaming)
 * @returns Array of Convex messages with streaming parts injected when applicable
 */
export function useMergedMessages(
	convexMessages: Doc<"messages">[] | null | undefined,
	vercelMessages: UIMessage[],
): Doc<"messages">[] {
	return useMemo(() => {
		// If no Convex messages, return empty array
		if (!convexMessages || convexMessages.length === 0) {
			return [];
		}

		// Create a map of Vercel messages by ID for quick lookup
		const vercelMessageMap = new Map<string, UIMessage>();
		for (const msg of vercelMessages) {
			vercelMessageMap.set(msg.id, msg);
		}

		// Process each Convex message
		return convexMessages.map((convexMsg) => {
			const vercelMsg = vercelMessageMap.get(convexMsg._id);

			// If there's a corresponding Vercel message with parts (streaming or complete)
			// and it's an assistant message, inject the Vercel parts
			if (
				vercelMsg &&
				vercelMsg.role === "assistant" &&
				vercelMsg.parts &&
				vercelMsg.parts.length > 0
			) {
				// Check if the message is actively streaming
				const isStreaming = vercelMsg.parts.some(
					(part) =>
						part.type === "text" &&
						typeof part.text === "string" &&
						!part.text.includes("⏹"), // Stream end marker
				);

				// Return the Convex message with Vercel parts injected
				return {
					...convexMsg,
					parts: vercelMsg.parts,
					status: isStreaming ? "streaming" : "ready",
				} as Doc<"messages">;
			}

			// No Vercel message or no streaming, return original Convex message
			return convexMsg;
		});
	}, [convexMessages, vercelMessages]);
}
