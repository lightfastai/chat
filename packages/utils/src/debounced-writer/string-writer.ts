import { DebouncedWriter } from "./base.js";
import type { DebouncedWriterConfig } from "./types.js";

/**
 * A debounced writer implementation for string data.
 * Concatenates incoming strings and flushes them based on time intervals.
 */
export abstract class StringDebouncedWriter extends DebouncedWriter<string> {
	constructor(config: DebouncedWriterConfig) {
		super(config, "");
	}

	protected merge(existing: string, incoming: string): string {
		return existing + incoming;
	}

	protected isEmpty(): boolean {
		return this.buffer.length === 0;
	}
}
