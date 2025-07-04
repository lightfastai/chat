import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import type { ActionCtx } from "../_generated/server.js";

/**
 * A debounced streaming text writer that batches chunks.
 * Prevents concurrent mutation conflicts by batching writes.
 */
export class StreamingTextWriter {
	private buffer: string[] = [];
	private timer: NodeJS.Timeout | null = null;
	private readonly flushDelay = 250; // ms
	private readonly maxDelay = 500; // ms
	private lastFlushTime = Date.now();

	constructor(
		private readonly messageId: Id<"messages">,
		private readonly ctx: ActionCtx,
	) {}

	/**
	 * Append text chunk - buffers for batched writing
	 */
	append(text: string): void {
		this.buffer.push(text);
		this.scheduleFlush();
	}

	private scheduleFlush(): void {
		if (this.timer) {
			clearTimeout(this.timer);
		}

		const elapsed = Date.now() - this.lastFlushTime;
		const shouldFlushNow = elapsed >= this.maxDelay && this.buffer.length > 0;

		if (shouldFlushNow) {
			void this.flush();
		} else if (this.buffer.length > 0) {
			this.timer = setTimeout(() => {
				void this.flush();
			}, this.flushDelay);
		}
	}

	/**
	 * Flush all buffered chunks as individual parts with the same timestamp
	 */
	async flush(): Promise<void> {
		if (this.buffer.length === 0) return;

		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}

		const texts = [...this.buffer];
		this.buffer = [];
		this.lastFlushTime = Date.now();

		// Create timestamp for this batch
		const batchTimestamp = Date.now();

		// Write all chunks in a single mutation with the same timestamp
		await this.ctx.runMutation(internal.messages.addTextParts, {
			messageId: this.messageId,
			parts: texts.map((text) => ({ text, timestamp: batchTimestamp })),
		});
	}

	/**
	 * Clean up any pending timers
	 */
	dispose(): void {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}
}

/**
 * A debounced streaming reasoning writer that batches chunks.
 * Prevents concurrent mutation conflicts by batching writes.
 */
export class StreamingReasoningWriter {
	private buffer: string[] = [];
	private timer: NodeJS.Timeout | null = null;
	private readonly flushDelay = 300; // ms
	private readonly maxDelay = 750; // ms
	private lastFlushTime = Date.now();

	constructor(
		private readonly messageId: Id<"messages">,
		private readonly ctx: ActionCtx,
	) {}

	/**
	 * Append reasoning chunk - buffers for batched writing
	 */
	append(text: string): void {
		this.buffer.push(text);
		this.scheduleFlush();
	}

	private scheduleFlush(): void {
		if (this.timer) {
			clearTimeout(this.timer);
		}

		const elapsed = Date.now() - this.lastFlushTime;
		const shouldFlushNow = elapsed >= this.maxDelay && this.buffer.length > 0;

		if (shouldFlushNow) {
			void this.flush();
		} else if (this.buffer.length > 0) {
			this.timer = setTimeout(() => {
				void this.flush();
			}, this.flushDelay);
		}
	}

	/**
	 * Flush all buffered chunks as individual parts with the same timestamp
	 */
	async flush(): Promise<void> {
		if (this.buffer.length === 0) return;

		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}

		const texts = [...this.buffer];
		this.buffer = [];
		this.lastFlushTime = Date.now();

		// Create timestamp for this batch
		const batchTimestamp = Date.now();

		// Write all chunks in a single mutation with the same timestamp
		await this.ctx.runMutation(internal.messages.addReasoningParts, {
			messageId: this.messageId,
			parts: texts.map((text) => ({ text, timestamp: batchTimestamp })),
		});
	}

	/**
	 * Clean up any pending timers
	 */
	dispose(): void {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}
}
