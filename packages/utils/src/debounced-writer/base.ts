import type { DebouncedWriterConfig } from "./types.js";

/**
 * Abstract base class for implementing debounced writers that accumulate data
 * and flush it based on configurable time intervals.
 */
export abstract class DebouncedWriter<T> {
	protected buffer: T;
	private timer: NodeJS.Timeout | null = null;
	private lastFlushTime = Date.now();

	constructor(
		protected readonly config: DebouncedWriterConfig,
		protected readonly emptyValue: T,
	) {
		this.buffer = emptyValue;
	}

	/**
	 * Appends data to the buffer and schedules a flush.
	 */
	append(data: T): void {
		this.buffer = this.merge(this.buffer, data);
		this.scheduleFlush();
	}

	private scheduleFlush(): void {
		if (this.timer) {
			clearTimeout(this.timer);
		}

		const elapsed = Date.now() - this.lastFlushTime;
		const shouldFlushNow = elapsed >= this.config.maxDelay && !this.isEmpty();

		if (shouldFlushNow) {
			void this.flush();
		} else if (!this.isEmpty()) {
			this.timer = setTimeout(() => {
				void this.flush();
			}, this.config.flushDelay);
		}
	}

	/**
	 * Flushes the buffer immediately if it contains data.
	 */
	async flush(): Promise<void> {
		if (this.isEmpty()) {
			return;
		}

		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}

		const data = this.buffer;
		this.buffer = this.emptyValue;
		this.lastFlushTime = Date.now();

		await this.write(data);
	}

	/**
	 * Cleans up any pending timers. Should be called when the writer is no longer needed.
	 */
	dispose(): void {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	/**
	 * Writes the accumulated data. Subclasses must implement this method.
	 */
	protected abstract write(data: T): Promise<void>;

	/**
	 * Merges incoming data with existing buffered data. Subclasses must implement this method.
	 */
	protected abstract merge(existing: T, incoming: T): T;

	/**
	 * Checks if the buffer is empty. Subclasses must implement this method.
	 */
	protected abstract isEmpty(): boolean;
}
