import type { Infer } from "convex/values";
import type { Doc } from "../../convex/_generated/dataModel";
import type {
	messagePartValidator,
	reasoningPartValidator,
	streamControlPartValidator,
	textPartValidator,
	toolCallPartValidator,
} from "../../convex/validators";

// === Core Types ===
// Using Convex validators for type consistency between client and server

// Text part for regular message content
export type TextPart = Infer<typeof textPartValidator>;

// Reasoning part for Claude thinking/reasoning content
export type ReasoningPart = Infer<typeof reasoningPartValidator>;

// Official Vercel AI SDK v5 compliant ToolCallPart
export type ToolCallPart = Infer<typeof toolCallPartValidator>;

// Stream control part for start/finish/metadata events
export type StreamControlPart = Infer<typeof streamControlPartValidator>;

// Union type for all message parts
export type MessagePart = Infer<typeof messagePartValidator>;

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

			// Add the non-text part (including reasoning parts)
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

// Helper to extract reasoning parts from a message
export function getReasoningParts(message: Doc<"messages">): ReasoningPart[] {
	if (!message.parts || message.parts.length === 0) return [];

	return message.parts.filter(
		(part): part is ReasoningPart => part.type === "reasoning",
	);
}

// Helper to check if message has reasoning content
export function hasReasoningContent(message: Doc<"messages">): boolean {
	if (!message.parts || message.parts.length === 0) return false;

	return message.parts.some((part) => part.type === "reasoning");
}

// Helper to get combined reasoning text
export function getCombinedReasoningText(message: Doc<"messages">): string {
	const reasoningParts = getReasoningParts(message);
	return reasoningParts.map((part) => part.text).join("");
}
