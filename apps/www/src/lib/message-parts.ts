import type { Doc } from "../../convex/_generated/dataModel";

// Types matching Vercel AI SDK v5 structure and new schema
export type TextPart = {
	type: "text";
	text: string;
};

// Official Vercel AI SDK v5 compliant ToolCallPart
export type ToolCallPart = {
	type: "tool-call";
	toolCallId: string;
	toolName: string;
	args?: any;
	result?: any;
	state: "partial-call" | "call" | "result"; // Official SDK states only
	step?: number; // Official SDK step tracking for multi-step calls
};

export type MessagePart = TextPart | ToolCallPart;

// Get message parts with text grouping (parts-based architecture only)
export function getMessageParts(message: Doc<"messages">): MessagePart[] {
	// Use the parts array directly (no legacy conversion needed)
	const parts = (message.parts || []) as MessagePart[];

	// Group consecutive text parts together to prevent line breaks
	return groupConsecutiveTextParts(parts);
}

// Group consecutive text parts together to prevent line breaks between chunks
function groupConsecutiveTextParts(parts: MessagePart[]): MessagePart[] {
	const groupedParts: MessagePart[] = [];
	let currentTextGroup = "";

	for (const part of parts) {
		if (part.type === "text") {
			currentTextGroup += part.text;
		} else {
			// Flush any accumulated text before adding non-text part
			if (currentTextGroup) {
				groupedParts.push({
					type: "text",
					text: currentTextGroup,
				});
				currentTextGroup = "";
			}

			// Add the non-text part
			groupedParts.push(part);
		}
	}

	// Don't forget to add any remaining text at the end
	if (currentTextGroup) {
		groupedParts.push({
			type: "text",
			text: currentTextGroup,
		});
	}

	return groupedParts;
}

// Note: Legacy conversion removed - we only support parts-based architecture now

// Helper to check if message has tool calls (parts-based architecture only)
export function hasToolInvocations(message: Doc<"messages">): boolean {
	if (!message.parts || message.parts.length === 0) return false;

	return message.parts.some((part) => part.type === "tool-call");
}
