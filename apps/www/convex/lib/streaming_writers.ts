import { StringDebouncedWriter } from "@repo/utils/debounced-writer/string-writer";
import type { DebouncedWriterConfig } from "@repo/utils/debounced-writer/types";
import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import type { ActionCtx } from "../_generated/server.js";

/**
 * A debounced writer for streaming text content to Convex messages.
 */
export class StreamingTextWriter extends StringDebouncedWriter {
	constructor(
		private readonly messageId: Id<"messages">,
		private readonly ctx: ActionCtx,
		config?: Partial<DebouncedWriterConfig>,
	) {
		super({
			flushDelay: config?.flushDelay ?? 250,
			maxDelay: config?.maxDelay ?? 500,
		});
	}

	protected async write(text: string): Promise<void> {
		await this.ctx.runMutation(internal.messages.addTextPart, {
			messageId: this.messageId,
			text,
		});
	}
}

/**
 * A debounced writer for streaming reasoning content to Convex messages.
 */
export class StreamingReasoningWriter extends StringDebouncedWriter {
	constructor(
		private readonly messageId: Id<"messages">,
		private readonly ctx: ActionCtx,
		config?: Partial<DebouncedWriterConfig>,
	) {
		super({
			flushDelay: config?.flushDelay ?? 300,
			maxDelay: config?.maxDelay ?? 750,
		});
	}

	protected async write(text: string): Promise<void> {
		await this.ctx.runMutation(internal.messages.addReasoningPart, {
			messageId: this.messageId,
			text,
		});
	}
}
