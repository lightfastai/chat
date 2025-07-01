import { useCallback, useState } from "react";

export interface UseCopyToClipboardOptions {
	/**
	 * The duration in milliseconds to show the "copied" state
	 * @default 2000
	 */
	timeout?: number;
	/**
	 * Callback function called when copy succeeds
	 */
	onSuccess?: (text: string) => void;
	/**
	 * Callback function called when copy fails
	 */
	onError?: (error: Error) => void;
}

export interface UseCopyToClipboardReturn {
	/**
	 * Function to copy text to clipboard
	 */
	copy: (text: string) => Promise<void>;
	/**
	 * Whether the text was recently copied
	 */
	isCopied: boolean;
	/**
	 * Whether the copy operation is in progress
	 */
	isLoading: boolean;
	/**
	 * Error from the last copy operation
	 */
	error: Error | null;
	/**
	 * Whether the browser supports the Clipboard API
	 */
	isSupported: boolean;
}

/**
 * Custom hook for copying text to clipboard with feedback states
 */
export function useCopyToClipboard(
	options: UseCopyToClipboardOptions = {},
): UseCopyToClipboardReturn {
	const { timeout = 2000, onSuccess, onError } = options;

	const [isCopied, setIsCopied] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	// Check if clipboard API is supported
	const isSupported =
		typeof navigator !== "undefined" &&
		typeof navigator.clipboard !== "undefined" &&
		typeof navigator.clipboard.writeText === "function";

	const copy = useCallback(
		async (text: string) => {
			if (!isSupported) {
				const err = new Error("Clipboard API not supported");
				setError(err);
				onError?.(err);
				return;
			}

			try {
				setIsLoading(true);
				setError(null);

				await navigator.clipboard.writeText(text);

				setIsCopied(true);
				onSuccess?.(text);

				// Reset copied state after timeout
				setTimeout(() => {
					setIsCopied(false);
				}, timeout);
			} catch (err) {
				const error = err instanceof Error ? err : new Error("Failed to copy");
				setError(error);
				onError?.(error);
			} finally {
				setIsLoading(false);
			}
		},
		[isSupported, timeout, onSuccess, onError],
	);

	return {
		copy,
		isCopied,
		isLoading,
		error,
		isSupported,
	};
}

/**
 * Fallback copy method using the older execCommand approach
 * This is useful for older browsers or when Clipboard API is not available
 */
export function fallbackCopyToClipboard(text: string): boolean {
	// Create a textarea element
	const textarea = document.createElement("textarea");
	textarea.value = text;

	// Make it invisible
	textarea.style.position = "fixed";
	textarea.style.top = "0";
	textarea.style.left = "0";
	textarea.style.width = "2em";
	textarea.style.height = "2em";
	textarea.style.padding = "0";
	textarea.style.border = "none";
	textarea.style.outline = "none";
	textarea.style.boxShadow = "none";
	textarea.style.background = "transparent";

	document.body.appendChild(textarea);
	textarea.focus();
	textarea.select();

	try {
		const successful = document.execCommand("copy");
		document.body.removeChild(textarea);
		return successful;
	} catch (err) {
		document.body.removeChild(textarea);
		return false;
	}
}

/**
 * Enhanced copy function that tries Clipboard API first, then falls back to execCommand
 */
export async function copyToClipboard(text: string): Promise<void> {
	// Try modern Clipboard API first
	if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return;
		} catch (err) {
			// Fall through to fallback method
		}
	}

	// Fallback to execCommand
	const success = fallbackCopyToClipboard(text);
	if (!success) {
		throw new Error("Failed to copy text to clipboard");
	}
}
