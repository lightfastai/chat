import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import type { ActionCtx } from "../_generated/server.js";

/**
 * A streaming text writer that writes each chunk immediately with timestamps.
 * No debouncing since each chunk is independent.
 */
export class StreamingTextWriter {
	constructor(
		private readonly messageId: Id<"messages">,
		private readonly ctx: ActionCtx,
	) {}

	/**
	 * Append text chunk with timestamp - writes immediately to preserve individual chunks
	 */
	async append(text: string, timestamp: number): Promise<void> {
		await this.ctx.runMutation(internal.messages.addTextPart, {
			messageId: this.messageId,
			text,
			timestamp,
		});
	}

	/**
	 * Flush is a no-op since we write immediately
	 */
	async flush(): Promise<void> {
		// No-op - we write immediately
	}

	/**
	 * Dispose is a no-op since we don't use timers
	 */
	dispose(): void {
		// No-op - no timers to clean up
	}
}

/**
 * A streaming reasoning writer that writes each chunk immediately with timestamps.
 * No debouncing since each chunk is independent.
 */
export class StreamingReasoningWriter {
	constructor(
		private readonly messageId: Id<"messages">,
		private readonly ctx: ActionCtx,
	) {}

	/**
	 * Append reasoning chunk with timestamp - writes immediately to preserve individual chunks
	 */
	async append(text: string, timestamp: number): Promise<void> {
		await this.ctx.runMutation(internal.messages.addReasoningPart, {
			messageId: this.messageId,
			text,
			timestamp,
		});
	}

	/**
	 * Flush is a no-op since we write immediately
	 */
	async flush(): Promise<void> {
		// No-op - we write immediately
	}

	/**
	 * Dispose is a no-op since we don't use timers
	 */
	dispose(): void {
		// No-op - no timers to clean up
	}
}
