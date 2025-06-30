import type { UIMessage } from "ai";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { MessagePart } from "../../../convex/validators";

// Type guards for UIMessage parts
interface UITextPart {
	type: "text";
	text: string;
}

interface UIReasoningPart {
	type: "reasoning";
	text: string;
	providerMetadata?: any;
}

// Type guard functions
function isTextPart(part: any): part is UITextPart {
	return part && part.type === "text" && typeof part.text === "string";
}

function isReasoningPart(part: any): part is UIReasoningPart {
	return part && part.type === "reasoning" && typeof part.text === "string";
}

/**
 * Convert a Convex message document to a Vercel AI SDK UIMessage
 */
export function convexMessageToUIMessage(message: Doc<"messages">): UIMessage {
	console.log("[convexMessageToUIMessage] Converting message:", {
		id: message._id,
		hasParts: !!message.parts,
		partsLength: message.parts?.length,
	});

	// Map messageType to role
	const role =
		message.messageType === "user"
			? "user"
			: message.messageType === "assistant"
				? "assistant"
				: "system";

	// Convert parts - no fallback to body anymore
	const parts = message.parts ? convexPartsToUIParts(message.parts) : [];

	console.log("[convexMessageToUIMessage] Converted parts:", parts);

	return {
		id: message._id,
		role,
		parts,
		metadata: {
			model: message.model,
			modelId: message.modelId,
			timestamp: message.timestamp,
			usage: message.usage,
			status: message.status,
			thinkingStartedAt: message.thinkingStartedAt,
			thinkingCompletedAt: message.thinkingCompletedAt,
		},
	};
}

/**
 * Convert an array of Convex message parts to UI message parts
 */
function convexPartsToUIParts(parts: MessagePart[]): any[] {
	const uiParts: any[] = [];

	for (const part of parts) {
		switch (part.type) {
			case "text":
				uiParts.push({
					type: "text",
					text: part.text,
				});
				break;

			case "reasoning":
				uiParts.push({
					type: "reasoning",
					text: part.text,
					providerMetadata: part.providerMetadata,
				});
				break;

			case "tool-call":
				// Convert to Vercel AI SDK tool part format
				uiParts.push({
					type: `tool-${part.toolName}` as `tool-${string}`,
					toolCallId: part.toolCallId,
					state: mapToolState(part.state),
					input: part.args || {},
					output: part.result,
					providerExecuted: false,
				});
				break;

			case "source":
				if (part.sourceType === "url") {
					uiParts.push({
						type: "source-url",
						sourceId: part.sourceId,
						url: part.url!,
						title: part.title,
						providerMetadata: part.metadata,
					});
				} else {
					uiParts.push({
						type: "source-document",
						sourceId: part.sourceId,
						mediaType: part.mediaType!,
						title: part.title || "",
						filename: part.filename,
						providerMetadata: part.metadata,
					});
				}
				break;

			case "file":
				// Ensure URL is always provided for Vercel AI SDK compatibility
				uiParts.push({
					type: "file",
					url: part.url || "#", // Provide fallback URL if empty
					mediaType: part.mediaType,
					filename: part.filename,
				});
				break;

			case "step":
				if (part.stepType === "start-step") {
					uiParts.push({
						type: "step-start",
					});
				}
				// finish-step is not a UI part type
				break;

			// Skip non-UI part types
			case "error":
			case "raw":
			case "control":
				// These are internal types not exposed in UI
				break;
		}
	}

	return uiParts;
}

/**
 * Map Convex tool state to Vercel AI SDK tool state
 */
function mapToolState(
	state: "partial-call" | "call" | "result",
): "input-streaming" | "input-available" | "output-available" | "output-error" {
	switch (state) {
		case "partial-call":
			return "input-streaming";
		case "call":
			return "input-available";
		case "result":
			return "output-available";
		default:
			return "input-available";
	}
}

/**
 * Convert a Vercel AI SDK UIMessage to Convex message format
 */
export function uiMessageToConvexMessage(
	uiMessage: UIMessage,
	threadId: Id<"threads">,
	additionalFields?: Partial<Doc<"messages">>,
): Omit<Doc<"messages">, "_id" | "_creationTime"> {
	const parts = uiPartsToConvexParts(uiMessage.parts);

	return {
		threadId,
		messageType:
			uiMessage.role === "user"
				? "user"
				: uiMessage.role === "assistant"
					? "assistant"
					: "system",
		timestamp: Date.now(),
		parts,
		status: "ready", // Default status for converted messages
		usage: {
			inputTokens: 0,
			outputTokens: 0,
			totalTokens: 0,
			reasoningTokens: 0,
			cachedInputTokens: 0,
		},
		...additionalFields,
	};
}

/**
 * Extract all text content from UI message parts
 * Note: This function is kept for backward compatibility but is no longer used in the main conversion flow
 */
function extractTextFromParts(parts: any[]): string {
	console.log(
		"[extractTextFromParts] input parts:",
		JSON.stringify(parts, null, 2),
	);
	const textParts: string[] = [];

	for (const part of parts) {
		console.log(
			"[extractTextFromParts] processing part:",
			JSON.stringify(part),
		);
		console.log("[extractTextFromParts] part type check:", {
			hasType: "type" in part,
			type: part?.type,
			hasText: "text" in part,
			textType: typeof part?.text,
			text: part?.text,
		});

		if (isTextPart(part)) {
			textParts.push(part.text);
			console.log("[extractTextFromParts] added text:", part.text);
		} else if (isReasoningPart(part)) {
			// Optionally include reasoning in body
			textParts.push(part.text);
			console.log("[extractTextFromParts] added reasoning:", part.text);
		} else if (part && (part.type === "text" || part.type === "reasoning")) {
			console.log(
				"[extractTextFromParts] WARNING: part failed type guard:",
				part,
			);
			// Try to extract text anyway if it exists
			if (part.text) {
				textParts.push(part.text);
				console.log(
					"[extractTextFromParts] WARNING: extracted text anyway:",
					part.text,
				);
			}
		}
	}

	const result = textParts.join("\n");
	console.log("[extractTextFromParts] final result:", result);
	return result;
}

/**
 * Convert UI message parts to Convex message parts
 */
function uiPartsToConvexParts(parts: any[]): MessagePart[] {
	const convexParts: MessagePart[] = [];

	for (const part of parts) {
		if (part.type === "text") {
			convexParts.push({
				type: "text",
				text: part.text,
			});
		} else if (part.type === "reasoning") {
			convexParts.push({
				type: "reasoning",
				text: part.text,
				providerMetadata: part.providerMetadata,
			});
		} else if (part.type.startsWith("tool-")) {
			// Extract tool name from type
			const toolName = part.type.substring(5);
			const toolPart = part as {
				toolCallId: string;
				input: Record<string, unknown>;
				output: unknown;
				state:
					| "input-streaming"
					| "input-available"
					| "output-available"
					| "output-error";
			};

			convexParts.push({
				type: "tool-call",
				toolCallId: toolPart.toolCallId,
				toolName,
				args: toolPart.input,
				result: toolPart.output,
				state: mapUIToolState(toolPart.state),
				step: undefined, // Will be set if needed
			});
		} else if (part.type === "source-url") {
			convexParts.push({
				type: "source",
				sourceType: "url",
				sourceId: part.sourceId,
				url: part.url,
				title: part.title,
				metadata: part.providerMetadata,
			});
		} else if (part.type === "source-document") {
			convexParts.push({
				type: "source",
				sourceType: "document",
				sourceId: part.sourceId,
				mediaType: part.mediaType,
				title: part.title,
				filename: part.filename,
				metadata: part.providerMetadata,
			});
		} else if (part.type === "file") {
			convexParts.push({
				type: "file",
				url: part.url,
				mediaType: part.mediaType,
				filename: part.filename,
			});
		} else if (part.type === "step-start") {
			convexParts.push({
				type: "step",
				stepType: "start-step",
			});
		}
	}

	return convexParts;
}

/**
 * Map UI tool state to Convex tool state
 */
function mapUIToolState(
	state:
		| "input-streaming"
		| "input-available"
		| "output-available"
		| "output-error",
): "partial-call" | "call" | "result" {
	switch (state) {
		case "input-streaming":
			return "partial-call";
		case "input-available":
			return "call";
		case "output-available":
		case "output-error":
			return "result";
		default:
			return "call";
	}
}

/**
 * Convert an array of Convex messages to UI messages
 */
export function convexMessagesToUIMessages(
	messages: Doc<"messages">[],
): UIMessage[] {
	console.log(
		"[convexMessagesToUIMessages] Converting",
		messages.length,
		"messages",
	);
	// Convex returns messages in descending order (newest first)
	// but UI expects ascending order (oldest first)
	const result = messages.map(convexMessageToUIMessage).reverse();
	console.log("[convexMessagesToUIMessages] Result:", result);
	return result;
}

/**
 * Merge Convex messages with Vercel AI SDK streaming state
 * This is useful when combining real-time Convex data with active streaming
 */
export function mergeMessagesWithStreamingState(
	convexMessages: Doc<"messages">[] | undefined,
	streamingMessages: UIMessage[],
): UIMessage[] {
	if (!convexMessages) return streamingMessages;

	const convexUIMessages = convexMessagesToUIMessages(convexMessages);

	// Create a map of streaming messages by ID for quick lookup
	const streamingMap = new Map(streamingMessages.map((msg) => [msg.id, msg]));

	// Create a map of Convex messages by ID for quick lookup
	const convexMap = new Map(convexUIMessages.map((msg) => [msg.id, msg]));

	// Start with Convex messages and merge with streaming state
	const mergedMessages = convexUIMessages.map((convexMsg) => {
		const streamingMsg = streamingMap.get(convexMsg.id);
		if (streamingMsg) {
			// Merge metadata but use streaming parts for active messages
			return {
				...streamingMsg,
				metadata: {
					...(convexMsg.metadata || {}),
					...(streamingMsg.metadata || {}),
				},
			};
		}
		return convexMsg;
	});

	// Add any streaming messages that don't exist in Convex yet (like new user messages)
	for (const streamingMsg of streamingMessages) {
		if (!convexMap.has(streamingMsg.id)) {
			mergedMessages.push(streamingMsg);
		}
	}

	// Sort by timestamp to maintain message order
	return mergedMessages.sort((a, b) => {
		const aTime = (a.metadata as { timestamp?: number })?.timestamp || 0;
		const bTime = (b.metadata as { timestamp?: number })?.timestamp || 0;
		return aTime - bTime;
	});
}

/**
 * Extract text content from a UIMessage for display
 */
export function extractUIMessageText(message: UIMessage): string {
	console.log("[extractUIMessageText] message:", message);
	console.log("[extractUIMessageText] parts:", message.parts);
	const text = extractTextFromParts(message.parts || []);
	console.log("[extractUIMessageText] extracted text:", text);
	return text;
}

/**
 * Check if a UIMessage has tool calls
 */
export function hasToolCalls(message: UIMessage): boolean {
	return message.parts.some((part) => part.type.startsWith("tool-"));
}

/**
 * Check if a UIMessage has reasoning content
 */
export function hasReasoningContent(message: UIMessage): boolean {
	return message.parts.some((part) => part.type === "reasoning");
}

/**
 * Check if an ID is a valid Convex document ID
 * Convex IDs have a specific format that differs from nanoid
 */
export function isValidConvexId(id: string): boolean {
	// Convex IDs are base64url encoded and have a specific length/format
	// They typically start with specific patterns and are longer than nanoid
	// For safety, we'll be conservative and check for known Convex ID patterns

	// Convex IDs are usually longer and have a different character set
	// nanoid typically generates IDs like "2uzgm4cvlhhhczqngwlwo" (21 chars)
	// Convex IDs are typically longer and may contain different patterns

	// Simple heuristic: if it looks like a temp ID or is too short, it's not a real Convex ID
	if (
		id.startsWith("temp_") ||
		id.startsWith("optimistic_") ||
		id.length < 25
	) {
		return false;
	}

	// Additional validation could be added here based on Convex ID format
	// For now, we'll assume anything that doesn't match our known temp patterns is valid
	return true;
}

/**
 * Convert a UIMessage to a Convex-like message format for display compatibility
 * This allows existing components to work with UIMessages
 */
export function uiMessageToDisplayMessage(
	uiMessage: UIMessage,
): Doc<"messages"> {
	const metadata = (uiMessage.metadata as any) || {};
	const parts = uiPartsToConvexParts(uiMessage.parts);

	// Convert UIMessage ID to valid Convex ID format if needed
	// UIMessage IDs from Vercel AI SDK might not be valid Convex IDs
	let convexId: Id<"messages">;
	if (uiMessage.id.startsWith("k") && uiMessage.id.length > 10) {
		// Looks like a real Convex ID, use as-is
		convexId = uiMessage.id as Id<"messages">;
	} else {
		// Generate a fake Convex-like ID for UI display
		// Use a consistent format so components don't crash
		convexId = `temp_${uiMessage.id}` as Id<"messages">;
	}

	// Create a Convex-like message object
	return {
		_id: convexId,
		_creationTime: metadata.timestamp || Date.now(),
		threadId: metadata.threadId || ("temp" as Id<"threads">),
		messageType:
			uiMessage.role === "user"
				? "user"
				: uiMessage.role === "assistant"
					? "assistant"
					: "system",
		timestamp: metadata.timestamp || Date.now(),
		parts,
		model: metadata.model,
		modelId: metadata.modelId,
		usage: metadata.usage || {
			inputTokens: 0,
			outputTokens: 0,
			totalTokens: 0,
			reasoningTokens: 0,
			cachedInputTokens: 0,
		},
		status: metadata.status || "ready",
		thinkingStartedAt: metadata.thinkingStartedAt,
		thinkingCompletedAt: metadata.thinkingCompletedAt,
		usedUserApiKey: metadata.usedUserApiKey,
		attachments: metadata.attachments,
	} as Doc<"messages">;
}
