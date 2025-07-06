import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import type { ActionCtx } from "../_generated/server.js";

/**
 * A streaming text writer that flushes on regular intervals.
 * Uses setInterval to ensure consistent 250ms flushes during active streaming.
 */
export class StreamingTextWriter {
	private buffer: Array<{ text: string; timestamp: number }> = [];
	private interval: NodeJS.Timeout | null = null;
	private readonly flushDelay = 250; // ms
	private isIntervalActive = false;

	constructor(
		private readonly messageId: Id<"messages">,
		private readonly ctx: ActionCtx,
	) {}

	/**
	 * Append text chunk - buffers for batched writing
	 */
	append(text: string): void {
		this.buffer.push({ text, timestamp: Date.now() });
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
	 * Flush all buffered chunks as individual parts with the same timestamp
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

		const chunks = [...this.buffer];
		this.buffer = [];

		// Use the earliest timestamp from the batch
		const batchTimestamp = Math.min(...chunks.map((chunk) => chunk.timestamp));

		// Concatenate all chunks into a single text part
		const combinedText = chunks.map((chunk) => chunk.text).join("");

		// Write as a single text part
		await this.ctx.runMutation(internal.messages.addTextPart, {
			messageId: this.messageId,
			text: combinedText,
			timestamp: batchTimestamp,
		});

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
	 * Clean up any pending intervals
	 */
	dispose(): void {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
		this.isIntervalActive = false;
	}
}

/**
 * A streaming reasoning writer that flushes on regular intervals.
 * Uses setInterval to ensure consistent 300ms flushes during active streaming.
 */
export class StreamingReasoningWriter {
	private buffer: Array<{ text: string; timestamp: number }> = [];
	private interval: NodeJS.Timeout | null = null;
	private readonly flushDelay = 300; // ms
	private isIntervalActive = false;

	constructor(
		private readonly messageId: Id<"messages">,
		private readonly ctx: ActionCtx,
	) {}

	/**
	 * Append reasoning chunk - buffers for batched writing
	 */
	append(text: string): void {
		this.buffer.push({ text, timestamp: Date.now() });
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
	 * Flush all buffered chunks as individual parts with the same timestamp
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

		const chunks = [...this.buffer];
		this.buffer = [];

		// Use the earliest timestamp from the batch
		const batchTimestamp = Math.min(...chunks.map((chunk) => chunk.timestamp));

		// Concatenate all chunks into a single reasoning part
		const combinedText = chunks.map((chunk) => chunk.text).join("");

		// Write as a single reasoning part
		await this.ctx.runMutation(internal.messages.addReasoningPart, {
			messageId: this.messageId,
			text: combinedText,
			timestamp: batchTimestamp,
		});

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
	 * Clean up any pending intervals
	 */
	dispose(): void {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
		this.isIntervalActive = false;
	}
}
