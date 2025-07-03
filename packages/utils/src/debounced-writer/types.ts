export interface DebouncedWriterConfig {
	/**
	 * The delay in milliseconds before flushing the buffer after the last append.
	 */
	flushDelay: number;

	/**
	 * The maximum delay in milliseconds before forcing a flush, regardless of activity.
	 */
	maxDelay: number;
}
