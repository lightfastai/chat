import type { Infer } from "convex/values";
import { internal } from "../../../_generated/api.js";
import type { Id } from "../../../_generated/dataModel.js";
import type { ActionCtx } from "../../../_generated/server.js";
import type {
	AddToolCallArgs,
	AddToolInputStartArgs,
	AddToolResultArgs,
} from "../../../types.js";
import type {
	addErrorPartArgsValidator,
	addFilePartArgsValidator,
	addRawPartArgsValidator,
	addReasoningPartArgsValidator,
	addSourceDocumentPartArgsValidator,
	addSourceUrlPartArgsValidator,
	addTextPartArgsValidator,
	addToolCallPartArgsValidator,
	addToolInputStartPartArgsValidator,
	addToolResultPartArgsValidator,
} from "../../../validators.js";

/**
 * Configuration options for the MessagePartWriter
 */
export interface MessagePartWriterConfig {
	/** Delay in milliseconds between flush operations (default: 250ms) */
	flushDelay?: number;
}

/**
 * BufferedChunk represents all chunk types that can be buffered by the message part writer.
 * Now directly using Infer with mutation argument validators for perfect type alignment.
 * Each chunk type corresponds exactly to its mutation argument validator.
 */
type BufferedChunk =
	| (Infer<typeof addTextPartArgsValidator> & { type: "text" })
	| (Infer<typeof addReasoningPartArgsValidator> & { type: "reasoning" })
	| (Infer<typeof addRawPartArgsValidator> & { type: "raw" })
	| (Infer<typeof addErrorPartArgsValidator> & {
			type: "error";
			timestamp: number;
	  })
	| (Infer<typeof addToolInputStartPartArgsValidator> & {
			type: "tool-input-start";
	  })
	| (Infer<typeof addToolCallPartArgsValidator> & { type: "tool-call" })
	| (Infer<typeof addToolResultPartArgsValidator> & { type: "tool-result" })
	| (Infer<typeof addSourceUrlPartArgsValidator> & { type: "source-url" })
	| (Infer<typeof addSourceDocumentPartArgsValidator> & {
			type: "source-document";
	  })
	| (Infer<typeof addFilePartArgsValidator> & { type: "file" });

/**
 * MessagePartWriter - Batched writer for AI message parts
 *
 * This writer buffers and batches all types of message parts while maintaining their
 * linear sequence. Text and reasoning chunks are accumulated and concatenated for
 * efficiency, while other chunk types are preserved individually.
 *
 * Key architectural change: Each append method now takes messageId as a parameter,
 * allowing the writer to handle multiple messages simultaneously and aligning
 * method signatures directly with mutation argument validators.
 *
 * Features:
 * - Batched writing with configurable flush delays
 * - Order preservation across all message part types
 * - Automatic text/reasoning accumulation
 * - Graceful error handling and cleanup
 * - Type-safe message part handling
 * - Multi-message support through messageId parameters
 */
export class MessagePartWriter {
	private buffer: BufferedChunk[] = [];
	private interval: NodeJS.Timeout | null = null;
	private readonly flushDelay: number;
	private isIntervalActive = false;

	constructor(
		private readonly ctx: ActionCtx,
		config: MessagePartWriterConfig = {},
	) {
		this.flushDelay = config.flushDelay ?? 250;
	}

	// ===== Content Append Methods =====

	/**
	 * Append text chunk - buffers for batched writing
	 */
	appendText(messageId: Id<"messages">, text: string): void {
		this.buffer.push({ messageId, type: "text", text, timestamp: Date.now() });
		this.scheduleFlush();
	}

	/**
	 * Append reasoning chunk - buffers for batched writing
	 */
	appendReasoning(messageId: Id<"messages">, text: string): void {
		this.buffer.push({
			messageId,
			type: "reasoning",
			text,
			timestamp: Date.now(),
		});
		this.scheduleFlush();
	}

	/**
	 * Append raw chunk - buffers for batched writing
	 */
	appendRaw(messageId: Id<"messages">, rawValue: unknown): void {
		this.buffer.push({
			messageId,
			type: "raw",
			rawValue,
			timestamp: Date.now(),
		});
		this.scheduleFlush();
	}

	/**
	 * Append error chunk - buffers for batched writing
	 */
	appendError(
		messageId: Id<"messages">,
		errorMessage: string,
		errorDetails?: Infer<typeof addErrorPartArgsValidator>["errorDetails"],
	): void {
		this.buffer.push({
			messageId,
			type: "error",
			errorMessage,
			errorDetails,
			timestamp: Date.now(),
		});
		this.scheduleFlush();
	}

	// ===== Tool-Related Append Methods =====

	/**
	 * Append tool input start chunk - buffers for batched writing
	 */
	appendToolInputStart(
		messageId: Id<"messages">,
		toolCallId: string,
		args: AddToolInputStartArgs,
	): void {
		this.buffer.push({
			messageId,
			type: "tool-input-start",
			toolCallId,
			args,
			timestamp: Date.now(),
		});
		this.scheduleFlush();
	}

	/**
	 * Append tool call chunk - buffers for batched writing
	 */
	appendToolCall(
		messageId: Id<"messages">,
		toolCallId: string,
		args: AddToolCallArgs,
	): void {
		this.buffer.push({
			messageId,
			type: "tool-call",
			toolCallId,
			args,
			timestamp: Date.now(),
		});
		this.scheduleFlush();
	}

	/**
	 * Append tool result chunk - buffers for batched writing
	 */
	appendToolResult(
		messageId: Id<"messages">,
		toolCallId: string,
		args: AddToolResultArgs,
	): void {
		this.buffer.push({
			messageId,
			type: "tool-result",
			toolCallId,
			args,
			timestamp: Date.now(),
		});
		this.scheduleFlush();
	}

	// ===== Source & Media Append Methods =====

	/**
	 * Append source URL chunk - buffers for batched writing
	 */
	appendSourceUrl(
		messageId: Id<"messages">,
		sourceId: string,
		url: string,
		title?: string,
	): void {
		this.buffer.push({
			messageId,
			type: "source-url",
			sourceId,
			url,
			title,
			timestamp: Date.now(),
		});
		this.scheduleFlush();
	}

	/**
	 * Append source document chunk - buffers for batched writing
	 */
	appendSourceDocument(
		messageId: Id<"messages">,
		sourceId: string,
		mediaType: string,
		title: string,
		filename?: string,
	): void {
		this.buffer.push({
			messageId,
			type: "source-document",
			sourceId,
			mediaType,
			title,
			filename,
			timestamp: Date.now(),
		});
		this.scheduleFlush();
	}

	/**
	 * Append file chunk - buffers for batched writing
	 */
	appendFile(
		messageId: Id<"messages">,
		mediaType: string,
		url: string,
		filename?: string,
	): void {
		this.buffer.push({
			messageId,
			type: "file",
			mediaType,
			filename,
			url,
			timestamp: Date.now(),
		});
		this.scheduleFlush();
	}

	// ===== Flush & Management Methods =====

	private scheduleFlush(): void {
		// If interval is already running, just let it continue
		if (this.isIntervalActive) {
			return;
		}

		// Start regular interval flushing
		if (this.buffer.length > 0) {
			this.isIntervalActive = true;
			this.interval = setInterval(() => {
				void this.flush();
			}, this.flushDelay);

			// Also flush immediately to avoid initial delay
			void this.flush();
		}
	}

	/**
	 * Flush all buffered chunks while maintaining order and accumulating text/reasoning
	 * Groups chunks by messageId and processes them efficiently
	 */
	async flush(): Promise<void> {
		if (this.buffer.length === 0) {
			// If buffer is empty, stop the interval
			if (this.interval) {
				clearInterval(this.interval);
				this.interval = null;
				this.isIntervalActive = false;
			}
			return;
		}

		// Take all buffered chunks and clear the buffer
		const chunks = [...this.buffer];
		this.buffer = [];

		// Group chunks by messageId to handle multiple messages efficiently
		const chunksByMessage = new Map<Id<"messages">, BufferedChunk[]>();
		for (const chunk of chunks) {
			const messageChunks = chunksByMessage.get(chunk.messageId) || [];
			messageChunks.push(chunk);
			chunksByMessage.set(chunk.messageId, messageChunks);
		}

		// Process each message's chunks while maintaining order
		const operations: Array<() => Promise<void>> = [];

		// Process chunks for each message
		for (const [messageId, messageChunks] of chunksByMessage) {
			let textAccumulator: { texts: string[]; timestamp: number } | null = null;
			let reasoningAccumulator: { texts: string[]; timestamp: number } | null =
				null;

			// Helper to flush accumulators for this message
			const flushAccumulators = () => {
				if (textAccumulator) {
					const acc = textAccumulator;
					operations.push(async () => {
						await this.ctx.runMutation(internal.messages.addTextPart, {
							messageId,
							text: acc.texts.join(""),
							timestamp: acc.timestamp,
						});
					});
					textAccumulator = null;
				}
				if (reasoningAccumulator) {
					const acc = reasoningAccumulator;
					operations.push(async () => {
						await this.ctx.runMutation(internal.messages.addReasoningPart, {
							messageId,
							text: acc.texts.join(""),
							timestamp: acc.timestamp,
						});
					});
					reasoningAccumulator = null;
				}
			};

			// Process each chunk for this message
			for (const chunk of messageChunks) {
				switch (chunk.type) {
					case "text":
						// Accumulate consecutive text chunks
						if (!textAccumulator) {
							textAccumulator = { texts: [], timestamp: chunk.timestamp };
						}
						textAccumulator.texts.push(chunk.text);
						break;

					case "reasoning":
						// Accumulate consecutive reasoning chunks
						if (!reasoningAccumulator) {
							reasoningAccumulator = { texts: [], timestamp: chunk.timestamp };
						}
						reasoningAccumulator.texts.push(chunk.text);
						break;

					case "raw": {
						// Flush any accumulated text/reasoning first
						flushAccumulators();

						// Add raw operation
						operations.push(async () => {
							await this.ctx.runMutation(internal.messages.addRawPart, {
								messageId: chunk.messageId,
								rawValue: chunk.rawValue,
								timestamp: chunk.timestamp,
							});
						});
						break;
					}

					case "tool-input-start": {
						// Flush any accumulated text/reasoning first
						flushAccumulators();

						// Add tool input start operation
						operations.push(async () => {
							await this.ctx.runMutation(
								internal.messages.addToolInputStartPart,
								{
									messageId: chunk.messageId,
									toolCallId: chunk.toolCallId,
									args: chunk.args,
									timestamp: chunk.timestamp,
								},
							);
						});
						break;
					}

					case "tool-call": {
						// Flush any accumulated text/reasoning first
						flushAccumulators();

						// Add tool call operation
						operations.push(async () => {
							await this.ctx.runMutation(internal.messages.addToolCallPart, {
								messageId: chunk.messageId,
								toolCallId: chunk.toolCallId,
								args: chunk.args,
								timestamp: chunk.timestamp,
							});
						});
						break;
					}

					case "tool-result": {
						// Flush any accumulated text/reasoning first
						flushAccumulators();

						// Add tool result operation
						operations.push(async () => {
							await this.ctx.runMutation(
								internal.messages.addToolResultCallPart,
								{
									messageId: chunk.messageId,
									toolCallId: chunk.toolCallId,
									args: chunk.args,
									timestamp: chunk.timestamp,
								},
							);
						});
						break;
					}

					case "source-url": {
						// Flush any accumulated text/reasoning first
						flushAccumulators();

						// Add source URL operation
						const {
							messageId: chunkMessageId,
							type,
							timestamp,
							...sourceUrlParams
						} = chunk;
						operations.push(async () => {
							await this.ctx.runMutation(internal.messages.addSourceUrlPart, {
								messageId: chunkMessageId,
								timestamp,
								...sourceUrlParams,
							});
						});
						break;
					}

					case "source-document": {
						// Flush any accumulated text/reasoning first
						flushAccumulators();

						// Add source document operation
						const {
							messageId: chunkMessageId,
							type,
							timestamp,
							...sourceDocParams
						} = chunk;
						operations.push(async () => {
							await this.ctx.runMutation(
								internal.messages.addSourceDocumentPart,
								{
									messageId: chunkMessageId,
									timestamp,
									...sourceDocParams,
								},
							);
						});
						break;
					}

					case "error": {
						// Flush any accumulated text/reasoning first
						flushAccumulators();

						// Add error operation
						operations.push(async () => {
							await this.ctx.runMutation(internal.messages.addErrorPart, {
								messageId: chunk.messageId,
								errorMessage: chunk.errorMessage,
								errorDetails: chunk.errorDetails,
							});
						});
						break;
					}

					case "file": {
						// Flush any accumulated text/reasoning first
						flushAccumulators();

						// Add file operation
						operations.push(async () => {
							await this.ctx.runMutation(internal.messages.addFilePart, {
								messageId: chunk.messageId,
								mediaType: chunk.mediaType,
								filename: chunk.filename,
								url: chunk.url,
								timestamp: chunk.timestamp,
							});
						});
						break;
					}
				}
			}

			// Flush any remaining accumulators for this message
			flushAccumulators();
		}

		// Execute all operations in order
		for (const operation of operations) {
			await operation();
		}

		// If buffer is still empty after flush, stop the interval
		if (this.buffer.length === 0) {
			if (this.interval) {
				clearInterval(this.interval);
				this.interval = null;
				this.isIntervalActive = false;
			}
		}
	}

	/**
	 * Clean up any pending intervals and flush remaining chunks
	 */
	async dispose(): Promise<void> {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
		this.isIntervalActive = false;
		await this.flush();
	}
}
