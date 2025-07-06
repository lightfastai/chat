/**
 * Unified Streaming Writer
 *
 * A type-safe wrapper around message mutation functions that provides a unified
 * interface for writing message parts during streaming. This abstracts away the
 * differences between HTTP streaming and WebSocket implementations.
 */

import type { GenericMutationCtx } from "convex/server";
import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import type { DataModel } from "../_generated/dataModel.js";

import type { Infer } from "convex/values";
// Import the exact types from validators for type safety
import type {
	addToolCallArgsValidator,
	addToolInputStartArgsValidator,
	addToolResultArgsValidator,
} from "../validators.js";

// Extract the inferred types from validators
type AddToolCallArgs = Infer<typeof addToolCallArgsValidator>;
type AddToolInputStartArgs = Infer<typeof addToolInputStartArgsValidator>;
type AddToolResultArgs = Infer<typeof addToolResultArgsValidator>;

export interface UnifiedStreamingWriter {
	// Text streaming
	addTextPart: (text: string, timestamp: number) => Promise<void>;

	// Reasoning streaming (for Claude thinking)
	addReasoningPart: (text: string, timestamp: number) => Promise<void>;

	// Raw debugging output
	addRawPart: (rawValue: unknown, timestamp: number) => Promise<void>;

	// Tool execution
	addToolCallPart: (
		toolCallId: string,
		timestamp: number,
		args: AddToolCallArgs,
	) => Promise<void>;
	addToolResultCallPart: (
		toolCallId: string,
		timestamp: number,
		args: AddToolResultArgs,
	) => Promise<void>;
	addToolInputStartPart: (
		toolCallId: string,
		timestamp: number,
		args: AddToolInputStartArgs,
	) => Promise<void>;

	// Source citations
	addSourceUrlPart: (params: {
		sourceId: string;
		url: string;
		title?: string;
		providerMetadata?: unknown;
		timestamp: number;
	}) => Promise<void>;

	addSourceDocumentPart: (params: {
		sourceId: string;
		mediaType: string;
		title: string;
		filename?: string;
		providerMetadata?: unknown;
		timestamp: number;
	}) => Promise<void>;

	// File attachments
	addFilePart?: (params: {
		mediaType: string;
		filename?: string;
		url: string;
		timestamp: number;
	}) => Promise<void>;

	// Error handling
	addErrorPart?: (
		errorMessage: string,
		errorDetails?: unknown,
	) => Promise<void>;

	// Status updates
	updateMessageStatus?: (
		status: "submitted" | "streaming" | "ready" | "error",
	) => Promise<void>;

	// Usage tracking
	updateMessageUsage?: (usage: {
		inputTokens?: number;
		outputTokens?: number;
		totalTokens?: number;
		reasoningTokens?: number;
		cachedInputTokens?: number;
	}) => Promise<void>;

	updateThreadUsage?: (
		messageUsage: {
			inputTokens?: number;
			outputTokens?: number;
			totalTokens?: number;
			reasoningTokens?: number;
			cachedInputTokens?: number;
		},
		modelId?: string,
	) => Promise<void>;
}

/**
 * Creates a UnifiedStreamingWriter that uses internal mutations directly.
 * This is used in HTTP streaming contexts where we have a mutation context.
 */
export function createMutationWriter(
	ctx: GenericMutationCtx<DataModel>,
	messageId: Id<"messages">,
	threadId: Id<"threads">,
): UnifiedStreamingWriter {
	return {
		addTextPart: async (text: string, timestamp: number) => {
			await ctx.runMutation(internal.messages.addTextPart, {
				messageId,
				text,
				timestamp,
			});
		},

		addReasoningPart: async (text: string, timestamp: number) => {
			await ctx.runMutation(internal.messages.addReasoningPart, {
				messageId,
				text,
				timestamp,
			});
		},

		addRawPart: async (rawValue: unknown, timestamp: number) => {
			await ctx.runMutation(internal.messages.addRawPart, {
				messageId,
				rawValue,
				timestamp,
			});
		},

		addToolCallPart: async (
			toolCallId: string,
			timestamp: number,
			args: AddToolCallArgs,
		) => {
			await ctx.runMutation(internal.messages.addToolCallPart, {
				messageId,
				toolCallId,
				timestamp,
				args,
			});
		},

		addToolResultCallPart: async (
			toolCallId: string,
			timestamp: number,
			args: AddToolResultArgs,
		) => {
			await ctx.runMutation(internal.messages.addToolResultCallPart, {
				messageId,
				toolCallId,
				timestamp,
				args,
			});
		},

		addToolInputStartPart: async (
			toolCallId: string,
			timestamp: number,
			args: AddToolInputStartArgs,
		) => {
			await ctx.runMutation(internal.messages.addToolInputStartPart, {
				messageId,
				toolCallId,
				timestamp,
				args,
			});
		},

		addSourceUrlPart: async (params) => {
			await ctx.runMutation(internal.messages.addSourceUrlPart, {
				messageId,
				...params,
			});
		},

		addSourceDocumentPart: async (params) => {
			await ctx.runMutation(internal.messages.addSourceDocumentPart, {
				messageId,
				...params,
			});
		},

		addFilePart: async (params) => {
			await ctx.runMutation(internal.messages.addFilePart, {
				messageId,
				...params,
			});
		},

		addErrorPart: async (errorMessage: string, errorDetails?: unknown) => {
			await ctx.runMutation(internal.messages.addErrorPart, {
				messageId,
				errorMessage,
				errorDetails,
			});
		},

		updateMessageStatus: async (status) => {
			await ctx.runMutation(internal.messages.updateMessageStatus, {
				messageId,
				status,
			});
		},

		updateMessageUsage: async (usage) => {
			await ctx.runMutation(internal.messages.updateMessageUsage, {
				messageId,
				usage,
			});
		},

		updateThreadUsage: async (messageUsage, modelId) => {
			await ctx.runMutation(internal.messages.updateThreadUsage, {
				threadId,
				messageUsage,
				modelId,
			});
		},
	};
}

/**
 * Creates a UnifiedStreamingWriter that collects operations for batch execution.
 * This is used in WebSocket contexts where we batch operations before sending.
 */
export interface BatchOperation {
	type: string;
	args: Record<string, unknown>; // Generic args object for mutations
}

export function createBatchWriter(
	messageId: Id<"messages">,
	threadId: Id<"threads">,
	operations: BatchOperation[],
): UnifiedStreamingWriter {
	return {
		addTextPart: async (text: string, timestamp: number) => {
			operations.push({
				type: "addTextPart",
				args: { messageId, text, timestamp },
			});
		},

		addReasoningPart: async (text: string, timestamp: number) => {
			operations.push({
				type: "addReasoningPart",
				args: { messageId, text, timestamp },
			});
		},

		addRawPart: async (rawValue: unknown, timestamp: number) => {
			operations.push({
				type: "addRawPart",
				args: { messageId, rawValue, timestamp },
			});
		},

		addToolCallPart: async (
			toolCallId: string,
			timestamp: number,
			args: AddToolCallArgs,
		) => {
			operations.push({
				type: "addToolCallPart",
				args: { messageId, toolCallId, timestamp, args },
			});
		},

		addToolResultCallPart: async (
			toolCallId: string,
			timestamp: number,
			args: AddToolResultArgs,
		) => {
			operations.push({
				type: "addToolResultCallPart",
				args: { messageId, toolCallId, timestamp, args },
			});
		},

		addToolInputStartPart: async (
			toolCallId: string,
			timestamp: number,
			args: AddToolInputStartArgs,
		) => {
			operations.push({
				type: "addToolInputStartPart",
				args: { messageId, toolCallId, timestamp, args },
			});
		},

		addSourceUrlPart: async (params) => {
			operations.push({
				type: "addSourceUrlPart",
				args: { messageId, ...params },
			});
		},

		addSourceDocumentPart: async (params) => {
			operations.push({
				type: "addSourceDocumentPart",
				args: { messageId, ...params },
			});
		},

		addFilePart: async (params) => {
			operations.push({
				type: "addFilePart",
				args: { messageId, ...params },
			});
		},

		addErrorPart: async (errorMessage: string, errorDetails?: unknown) => {
			operations.push({
				type: "addErrorPart",
				args: { messageId, errorMessage, errorDetails },
			});
		},

		updateMessageStatus: async (status) => {
			operations.push({
				type: "updateMessageStatus",
				args: { messageId, status },
			});
		},

		updateMessageUsage: async (usage) => {
			operations.push({
				type: "updateMessageUsage",
				args: { messageId, usage },
			});
		},

		updateThreadUsage: async (messageUsage, modelId) => {
			operations.push({
				type: "updateThreadUsage",
				args: { threadId, messageUsage, modelId },
			});
		},
	};
}

/**
 * Executes a batch of operations using the provided context.
 * This is called after collecting operations with createBatchWriter.
 */
export async function executeBatchOperations(
	ctx: GenericMutationCtx<DataModel>,
	operations: BatchOperation[],
): Promise<void> {
	for (const op of operations) {
		switch (op.type) {
			case "addTextPart":
				await ctx.runMutation(internal.messages.addTextPart, op.args as any);
				break;
			case "addReasoningPart":
				await ctx.runMutation(
					internal.messages.addReasoningPart,
					op.args as any,
				);
				break;
			case "addRawPart":
				await ctx.runMutation(internal.messages.addRawPart, op.args as any);
				break;
			case "addToolCallPart":
				await ctx.runMutation(
					internal.messages.addToolCallPart,
					op.args as any,
				);
				break;
			case "addToolResultCallPart":
				await ctx.runMutation(
					internal.messages.addToolResultCallPart,
					op.args as any,
				);
				break;
			case "addToolInputStartPart":
				await ctx.runMutation(
					internal.messages.addToolInputStartPart,
					op.args as any,
				);
				break;
			case "addSourceUrlPart":
				await ctx.runMutation(
					internal.messages.addSourceUrlPart,
					op.args as any,
				);
				break;
			case "addSourceDocumentPart":
				await ctx.runMutation(
					internal.messages.addSourceDocumentPart,
					op.args as any,
				);
				break;
			case "addFilePart":
				await ctx.runMutation(internal.messages.addFilePart, op.args as any);
				break;
			case "addErrorPart":
				await ctx.runMutation(internal.messages.addErrorPart, op.args as any);
				break;
			case "updateMessageStatus":
				await ctx.runMutation(
					internal.messages.updateMessageStatus,
					op.args as any,
				);
				break;
			case "updateMessageUsage":
				await ctx.runMutation(
					internal.messages.updateMessageUsage,
					op.args as any,
				);
				break;
			case "updateThreadUsage":
				await ctx.runMutation(
					internal.messages.updateThreadUsage,
					op.args as any,
				);
				break;
		}
	}
}
