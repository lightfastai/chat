import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import type { MessagePart, StreamEnvelope } from "./validators";

/**
 * HybridStreamWriter - Implements dual-write strategy for optimal streaming
 *
 * Key features:
 * 1. Immediate HTTP delivery via envelope format
 * 2. Throttled database writes (250ms) for multi-client sync
 * 3. Sentence boundary optimization for natural chunking
 * 4. Automatic sequence tracking and ordering
 */
export class HybridStreamWriter {
	private sequence = 0;
	private pendingText = "";
	private pendingDeltas: Array<{
		text: string;
		partType: string;
		metadata?: any;
	}> = [];
	private lastDbWrite = 0;
	private readonly dbWriteThrottle = 250; // ms
	private encoder = new TextEncoder();
	private httpConnected = true;
	private streamCompleted = false;

	constructor(
		private ctx: ActionCtx,
		private messageId: Id<"messages">,
		private streamId: Id<"streams">,
		private httpController?: ReadableStreamDefaultController,
	) {
		this.lastDbWrite = Date.now();
		this.httpConnected = !!httpController;
	}

	/**
	 * Mark HTTP connection as disconnected but continue database writes
	 */
	onHttpDisconnect(): void {
		this.httpConnected = false;
		console.log(
			`HTTP disconnected for stream ${this.streamId}, continuing database writes`,
		);
	}

	/**
	 * Check if HTTP connection is still active
	 */
	isHttpConnected(): boolean {
		return this.httpConnected;
	}

	/**
	 * Check if stream has been completed
	 */
	isCompleted(): boolean {
		return this.streamCompleted;
	}

	/**
	 * Write a text chunk - the most common streaming operation
	 */
	async writeTextChunk(text: string): Promise<void> {
		// 1. IMMEDIATE: Send via HTTP stream
		await this.sendHttpChunk({
			type: "text",
			text,
		});

		// 2. ACCUMULATE: For database throttling
		this.pendingText += text;
		this.pendingDeltas.push({
			text,
			partType: "text",
		});

		// 3. THROTTLED: Write to database if conditions met
		if (this.shouldWriteToDb(text)) {
			await this.flushToDatabase();
		}
	}

	/**
	 * Write a tool call part
	 */
	async writeToolCall(toolCall: {
		toolCallId: string;
		toolName: string;
		args?: any;
		result?: any;
		state: "partial-call" | "call" | "result";
	}): Promise<void> {
		const part: MessagePart = {
			type: "tool-call",
			toolCallId: toolCall.toolCallId,
			toolName: toolCall.toolName,
			args: toolCall.args,
			result: toolCall.result,
			state: toolCall.state,
		};

		// Send via HTTP immediately
		await this.sendHttpChunk(part);

		// Add to pending deltas
		this.pendingDeltas.push({
			text: JSON.stringify({
				toolCallId: toolCall.toolCallId,
				toolName: toolCall.toolName,
				args: toolCall.args,
				result: toolCall.result,
			}),
			partType: "tool-call",
			metadata: {
				toolCallId: toolCall.toolCallId,
				toolName: toolCall.toolName,
				state: toolCall.state,
			},
		});

		// Tool calls should be written immediately for proper ordering
		await this.flushToDatabase();
	}

	/**
	 * Write reasoning/thinking content
	 */
	async writeReasoning(text: string): Promise<void> {
		const part: MessagePart = {
			type: "reasoning",
			text,
		};

		await this.sendHttpChunk(part);

		this.pendingDeltas.push({
			text,
			partType: "reasoning",
		});

		// Reasoning chunks can be throttled like text
		if (this.shouldWriteToDb(text)) {
			await this.flushToDatabase();
		}
	}

	/**
	 * Write an error part
	 */
	async writeError(errorMessage: string, errorDetails?: any): Promise<void> {
		const part: MessagePart = {
			type: "error",
			errorMessage,
			errorDetails,
		};

		await this.sendHttpChunk(part);

		this.pendingDeltas.push({
			text: errorMessage,
			partType: "error",
			metadata: errorDetails,
		});

		// Errors should be written immediately
		await this.flushToDatabase();
	}

	/**
	 * Send stream start event (protected by connection status)
	 */
	async sendStreamStart(metadata: any = {}): Promise<void> {
		// Only send via HTTP if connection is active
		if (this.httpConnected && this.httpController) {
			try {
				const envelope: StreamEnvelope = {
					streamId: this.streamId,
					messageId: this.messageId,
					sequence: this.sequence++,
					timestamp: Date.now(),
					event: {
						type: "stream-start",
						metadata,
					},
				};

				const chunk = {
					type: "content" as const,
					envelope,
				};

				this.httpController.enqueue(
					this.encoder.encode(`${JSON.stringify(chunk)}\n`),
				);
			} catch (error) {
				console.warn(`HTTP stream start failed, marking disconnected:`, error);
				this.onHttpDisconnect();
			}
		}
	}

	/**
	 * Finish the stream and clean up (handles connection state)
	 */
	async finish(): Promise<void> {
		if (this.streamCompleted) {
			return; // Already completed
		}

		// Flush any remaining deltas to database
		await this.flushToDatabase();

		// Send stream end event via HTTP if connected
		if (this.httpConnected && this.httpController) {
			try {
				const envelope: StreamEnvelope = {
					streamId: this.streamId,
					messageId: this.messageId,
					sequence: this.sequence++,
					timestamp: Date.now(),
					event: {
						type: "stream-end",
						metadata: {},
					},
				};

				const chunk = {
					type: "content" as const,
					envelope,
				};

				this.httpController.enqueue(
					this.encoder.encode(`${JSON.stringify(chunk)}\n`),
				);
				this.httpController.close();
			} catch (error) {
				console.warn(`HTTP stream end failed:`, error);
			}
		}

		// Mark stream as complete in database (always do this)
		await this.ctx.runMutation(internal.streams.markComplete, {
			streamId: this.streamId,
		});

		this.streamCompleted = true;
		console.log(
			`Stream ${this.streamId} completed (HTTP: ${this.httpConnected})`,
		);
	}

	/**
	 * Handle stream error (handles connection state)
	 */
	async handleError(error: string, code?: string): Promise<void> {
		if (this.streamCompleted) {
			return; // Already completed
		}

		// Flush any pending deltas first
		await this.flushToDatabase();

		// Send error event via HTTP if connected
		if (this.httpConnected && this.httpController) {
			try {
				const envelope: StreamEnvelope = {
					streamId: this.streamId,
					messageId: this.messageId,
					sequence: this.sequence++,
					timestamp: Date.now(),
					event: {
						type: "stream-error",
						error,
						code,
					},
				};

				const chunk = {
					type: "content" as const,
					envelope,
				};

				this.httpController.enqueue(
					this.encoder.encode(`${JSON.stringify(chunk)}\n`),
				);
				this.httpController.close();
			} catch (httpError) {
				console.warn(`HTTP error notification failed:`, httpError);
			}
		}

		// Mark stream as error in database (always do this)
		await this.ctx.runMutation(internal.streams.markError, {
			streamId: this.streamId,
			error,
		});

		this.streamCompleted = true;
		console.log(
			`Stream ${this.streamId} failed: ${error} (HTTP: ${this.httpConnected})`,
		);
	}

	/**
	 * Send a message part via HTTP stream (protected by connection status)
	 */
	async sendHttpChunk(part: MessagePart): Promise<void> {
		// Always increment sequence for consistency
		const sequence = this.sequence++;

		// Only send via HTTP if connection is active
		if (this.httpConnected && this.httpController) {
			try {
				const envelope: StreamEnvelope = {
					streamId: this.streamId,
					messageId: this.messageId,
					sequence,
					timestamp: Date.now(),
					part,
				};

				const chunk = {
					type: "content" as const,
					envelope,
				};

				this.httpController.enqueue(
					this.encoder.encode(`${JSON.stringify(chunk)}\n`),
				);
			} catch (error) {
				// Connection likely closed, mark as disconnected
				console.warn(`HTTP write failed, marking disconnected:`, error);
				this.onHttpDisconnect();
			}
		}
	}

	/**
	 * Determine if we should write to database based on:
	 * 1. Time threshold (250ms)
	 * 2. Sentence boundaries
	 * 3. Significant text length
	 */
	private shouldWriteToDb(text: string): boolean {
		const now = Date.now();
		const hasDelimiter = /[.!?]\s/.test(text); // Sentence boundary
		const timeThreshold = now - this.lastDbWrite >= this.dbWriteThrottle;
		const significantLength = this.pendingText.length >= 50; // Chunk size threshold

		return hasDelimiter || timeThreshold || significantLength;
	}

	/**
	 * Flush accumulated deltas to database
	 */
	private async flushToDatabase(): Promise<void> {
		if (this.pendingDeltas.length === 0) return;

		// Write all pending deltas in sequence
		for (const delta of this.pendingDeltas) {
			await this.ctx.runMutation(internal.streamDeltas.addDelta, {
				messageId: this.messageId,
				streamId: this.streamId,
				sequence:
					this.sequence -
					this.pendingDeltas.length +
					this.pendingDeltas.indexOf(delta),
				text: delta.text,
				timestamp: Date.now(),
				partType: delta.partType,
				metadata: delta.metadata,
			});
		}

		// Clear accumulated state
		this.pendingText = "";
		this.pendingDeltas = [];
		this.lastDbWrite = Date.now();
	}
}
