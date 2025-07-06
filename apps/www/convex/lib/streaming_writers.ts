import type { Infer } from "convex/values";
import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import type { ActionCtx } from "../_generated/server.js";
import type {
	addToolCallArgsValidator,
	addToolInputStartArgsValidator,
	addToolResultArgsValidator,
} from "../validators.js";

// Extract the inferred types from validators
type AddToolCallArgs = Infer<typeof addToolCallArgsValidator>;
type AddToolInputStartArgs = Infer<typeof addToolInputStartArgsValidator>;
type AddToolResultArgs = Infer<typeof addToolResultArgsValidator>;

/**
 * Represents all possible chunk types that can be buffered
 * These types are inferred from the database mutations
 */
type BufferedChunk =
	| { type: "text"; text: string; timestamp: number }
	| { type: "reasoning"; text: string; timestamp: number }
	| { type: "raw"; rawValue: unknown; timestamp: number }
	| {
			type: "toolInputStart";
			toolCallId: string;
			args: AddToolInputStartArgs;
			timestamp: number;
	  }
	| {
			type: "toolCall";
			toolCallId: string;
			args: AddToolCallArgs;
			timestamp: number;
	  }
	| {
			type: "toolResultCall";
			toolCallId: string;
			args: AddToolResultArgs;
			timestamp: number;
	  }
	| {
			type: "sourceUrl";
			sourceId: string;
			url: string;
			title?: string;
			providerMetadata?: unknown;
			timestamp: number;
	  }
	| {
			type: "sourceDocument";
			sourceId: string;
			mediaType: string;
			title: string;
			filename?: string;
			providerMetadata?: unknown;
			timestamp: number;
	  };

/**
 * Unified streaming writer that batches all chunk types and maintains their linear sequence.
 * Text and reasoning chunks are accumulated and concatenated, while other chunk types
 * are preserved individually.
 */
export class UnifiedStreamingWriter {
	private buffer: BufferedChunk[] = [];
	private interval: NodeJS.Timeout | null = null;
	private readonly flushDelay = 250; // Single interval for all chunk types
	private isIntervalActive = false;

	constructor(
		private readonly messageId: Id<"messages">,
		private readonly ctx: ActionCtx,
	) {}

	/**
	 * Append text chunk - buffers for batched writing
	 */
	appendText(text: string): void {
		this.buffer.push({ type: "text", text, timestamp: Date.now() });
		this.scheduleFlush();
	}

	/**
	 * Append reasoning chunk - buffers for batched writing
	 */
	appendReasoning(text: string): void {
		this.buffer.push({ type: "reasoning", text, timestamp: Date.now() });
		this.scheduleFlush();
	}

	/**
	 * Append raw chunk - buffers for batched writing
	 */
	appendRaw(rawValue: unknown): void {
		this.buffer.push({ type: "raw", rawValue, timestamp: Date.now() });
		this.scheduleFlush();
	}

	/**
	 * Append tool input start chunk - buffers for batched writing
	 */
	appendToolInputStart(toolCallId: string, args: AddToolInputStartArgs): void {
		this.buffer.push({
			type: "toolInputStart",
			toolCallId,
			args,
			timestamp: Date.now(),
		});
		this.scheduleFlush();
	}

	/**
	 * Append tool call chunk - buffers for batched writing
	 */
	appendToolCall(toolCallId: string, args: AddToolCallArgs): void {
		this.buffer.push({
			type: "toolCall",
			toolCallId,
			args,
			timestamp: Date.now(),
		});
		this.scheduleFlush();
	}

	/**
	 * Append tool result chunk - buffers for batched writing
	 */
	appendToolResult(toolCallId: string, args: AddToolResultArgs): void {
		this.buffer.push({
			type: "toolResultCall",
			toolCallId,
			args,
			timestamp: Date.now(),
		});
		this.scheduleFlush();
	}

	/**
	 * Append source URL chunk - buffers for batched writing
	 */
	appendSourceUrl(
		sourceId: string,
		url: string,
		title?: string,
		providerMetadata?: unknown,
	): void {
		this.buffer.push({
			type: "sourceUrl",
			sourceId,
			url,
			title,
			providerMetadata,
			timestamp: Date.now(),
		});
		this.scheduleFlush();
	}

	/**
	 * Append source document chunk - buffers for batched writing
	 */
	appendSourceDocument(
		sourceId: string,
		mediaType: string,
		title: string,
		filename?: string,
		providerMetadata?: unknown,
	): void {
		this.buffer.push({
			type: "sourceDocument",
			sourceId,
			mediaType,
			title,
			filename,
			providerMetadata,
			timestamp: Date.now(),
		});
		this.scheduleFlush();
	}

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

		// Process chunks while maintaining order
		// We'll accumulate consecutive text/reasoning chunks
		const operations: Array<() => Promise<void>> = [];

		let textAccumulator: { texts: string[]; timestamp: number } | null = null;
		let reasoningAccumulator: { texts: string[]; timestamp: number } | null =
			null;

		// Helper to flush accumulators
		const flushAccumulators = () => {
			if (textAccumulator) {
				const acc = textAccumulator;
				operations.push(async () => {
					await this.ctx.runMutation(internal.messages.addTextPart, {
						messageId: this.messageId,
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
						messageId: this.messageId,
						text: acc.texts.join(""),
						timestamp: acc.timestamp,
					});
				});
				reasoningAccumulator = null;
			}
		};

		// Process each chunk
		for (const chunk of chunks) {
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
							messageId: this.messageId,
							rawValue: chunk.rawValue,
							timestamp: chunk.timestamp,
						});
					});
					break;
				}

				case "toolInputStart": {
					// Flush any accumulated text/reasoning first
					flushAccumulators();

					// Add tool input start operation
					operations.push(async () => {
						await this.ctx.runMutation(
							internal.messages.addToolInputStartPart,
							{
								messageId: this.messageId,
								toolCallId: chunk.toolCallId,
								args: chunk.args,
								timestamp: chunk.timestamp,
							},
						);
					});
					break;
				}

				case "toolCall": {
					// Flush any accumulated text/reasoning first
					flushAccumulators();

					// Add tool call operation
					operations.push(async () => {
						await this.ctx.runMutation(internal.messages.addToolCallPart, {
							messageId: this.messageId,
							toolCallId: chunk.toolCallId,
							args: chunk.args,
							timestamp: chunk.timestamp,
						});
					});
					break;
				}

				case "toolResultCall": {
					// Flush any accumulated text/reasoning first
					flushAccumulators();

					// Add tool result operation
					operations.push(async () => {
						await this.ctx.runMutation(
							internal.messages.addToolResultCallPart,
							{
								messageId: this.messageId,
								toolCallId: chunk.toolCallId,
								args: chunk.args,
								timestamp: chunk.timestamp,
							},
						);
					});
					break;
				}

				case "sourceUrl": {
					// Flush any accumulated text/reasoning first
					flushAccumulators();

					// Add source URL operation
					operations.push(async () => {
						await this.ctx.runMutation(internal.messages.addSourceUrlPart, {
							messageId: this.messageId,
							sourceId: chunk.sourceId,
							url: chunk.url,
							title: chunk.title,
							providerMetadata: chunk.providerMetadata,
							timestamp: chunk.timestamp,
						});
					});
					break;
				}

				case "sourceDocument": {
					// Flush any accumulated text/reasoning first
					flushAccumulators();

					// Add source document operation
					operations.push(async () => {
						await this.ctx.runMutation(
							internal.messages.addSourceDocumentPart,
							{
								messageId: this.messageId,
								sourceId: chunk.sourceId,
								mediaType: chunk.mediaType,
								title: chunk.title,
								filename: chunk.filename,
								providerMetadata: chunk.providerMetadata,
								timestamp: chunk.timestamp,
							},
						);
					});
					break;
				}
			}
		}

		// Flush any remaining accumulators
		flushAccumulators();

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
