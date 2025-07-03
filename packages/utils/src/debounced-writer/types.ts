export interface DebouncedWriterConfig {
	/**
	 * The delay in milliseconds before flushing the buffer after the last append.
	 */
	flushDelay: number;

	/**
	 * The maximum delay in milliseconds before forcing a flush, regardless of activity.
	 */
	maxDelay: number;

	/**
	 * Maximum number of retry attempts for failed writes.
	 * @default 3
	 */
	maxRetries?: number;

	/**
	 * Base delay in milliseconds for exponential backoff retry strategy.
	 * @default 100
	 */
	retryBaseDelay?: number;

	/**
	 * Callback function called when a write operation fails after all retries.
	 */
	onWriteError?: (error: Error, data: unknown) => void;
}
