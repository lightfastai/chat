/**
 * Shared types for HTTP streaming functionality
 * These types are used by both client and server code
 */

import type { Doc, Id } from "./_generated/dataModel";

/**
 * Stream chunk types that can be sent over HTTP streaming
 */
export type StreamChunkType = 
	| "text-delta"    // Incremental text content
	| "tool-call"     // Tool invocation
	| "tool-result"   // Tool execution result
	| "completion"    // Stream completed successfully
	| "error";        // Stream error

/**
 * Stream chunk sent over HTTP streaming
 */
export interface StreamChunk {
	type: StreamChunkType;
	text?: string;
	messageId: Id<"messages">;
	streamId?: Id<"streams">;
	error?: string;
	timestamp: number;
	// Tool-related fields
	toolName?: string;
	toolCallId?: string;
	args?: unknown;    // Tool arguments can be any shape
	result?: unknown;  // Tool results can be any shape
}

/**
 * HTTP streaming request payload
 */
export interface HTTPStreamingRequest {
	threadId: Id<"threads">;
	modelId: string;
	messages: Array<{
		role: Doc<"messages">["messageType"];
		content: string;
	}>;
}

/**
 * Streaming message type for client-side state
 */
export interface StreamingMessage {
	_id: Id<"messages">;
	body: string;
	isStreaming: boolean;
	isComplete: boolean;
	timestamp: number;
	messageType: Doc<"messages">["messageType"];
	modelId?: string;
}