/**
 * Error handling utilities for the chat application
 *
 * This module provides small, composable functions for handling different types
 * of errors in the streaming infrastructure. Each function has a single responsibility
 * and can be easily tested and reused.
 */

import type { Infer } from "convex/values";
import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import type { ActionCtx } from "../_generated/server.js";
import type {
	errorContextValidator,
	errorDetailsValidator,
	errorTypeValidator,
} from "../validators.js";

// Type aliases for better type safety
export type ErrorType = Infer<typeof errorTypeValidator>;
export type ErrorContext = Infer<typeof errorContextValidator>;
export type ErrorDetails = Infer<typeof errorDetailsValidator>;

/**
 * Extract structured error details from any error type
 * Now returns validated ErrorDetails matching our schema
 */
export function extractErrorDetails(
	error: unknown,
	context?: ErrorContext,
	modelId?: string,
): ErrorDetails {
	const baseDetails: ErrorDetails =
		error instanceof Error
			? {
					name: error.name,
					message: error.message,
					stack: error.stack,
					raw: error,
				}
			: {
					name: "Unknown Error",
					message: String(error),
					stack: undefined,
					raw: error,
				};

	// Add enhanced details
	const errorType = classifyError(error);
	const isRetryable = isRetryableError(error);

	return {
		...baseDetails,
		context,
		modelId,
		errorType,
		timestamp: Date.now(),
		retryable: isRetryable,
	};
}

/**
 * Format error message for user display
 * Converts technical errors into user-friendly messages
 */
export function formatErrorMessage(error: unknown): string {
	const details = extractErrorDetails(error);

	// Handle specific error types with user-friendly messages
	if (details.message.toLowerCase().includes("rate limit")) {
		return "Rate limit exceeded. Please wait a moment before trying again.";
	}

	if (details.message.toLowerCase().includes("timeout")) {
		return "Request timed out. Please try again.";
	}

	if (
		details.message.toLowerCase().includes("unauthorized") ||
		details.message.toLowerCase().includes("api key")
	) {
		return "Authentication error. Please check your API keys in settings.";
	}

	if (
		details.message.toLowerCase().includes("quota") ||
		details.message.toLowerCase().includes("billing")
	) {
		return "API quota exceeded. Please check your billing status.";
	}

	// Default fallback with some context
	return `Error: ${details.message}. Please check your API keys and try again.`;
}

/**
 * Log streaming errors with proper context and categorization
 */
export function logStreamingError(error: unknown, context?: string): void {
	const details = extractErrorDetails(error);
	const contextPrefix = context ? `[${context}] ` : "";

	// Log based on error type for better monitoring
	if (details.message.toLowerCase().includes("rate limit")) {
		console.error(`${contextPrefix}Rate limit error:`, error);
	} else if (details.message.toLowerCase().includes("timeout")) {
		console.error(`${contextPrefix}Timeout error:`, error);
	} else if (
		details.message.toLowerCase().includes("unauthorized") ||
		details.message.toLowerCase().includes("api key")
	) {
		console.error(`${contextPrefix}Authentication error:`, error);
	} else if (
		details.message.toLowerCase().includes("quota") ||
		details.message.toLowerCase().includes("billing")
	) {
		console.error(`${contextPrefix}Quota/billing error:`, error);
	} else {
		console.error(`${contextPrefix}Streaming error:`, error);
	}

	// Always log error details for debugging
	console.error(
		`Error details - Name: ${details.name}, Message: ${details.message}`,
	);
	if (details.stack) {
		console.error(`Stack trace: ${details.stack.substring(0, 500)}...`);
	}
}

/**
 * Classify error type for monitoring and handling
 * Now returns validated ErrorType
 */
export function classifyError(error: unknown): ErrorType {
	const message = error instanceof Error ? error.message : String(error);
	const lowerMessage = message.toLowerCase();

	if (lowerMessage.includes("rate limit")) return "rate_limit";
	if (lowerMessage.includes("timeout")) return "timeout";
	if (lowerMessage.includes("unauthorized") || lowerMessage.includes("api key"))
		return "auth";
	if (lowerMessage.includes("quota") || lowerMessage.includes("billing"))
		return "quota";
	if (lowerMessage.includes("network") || lowerMessage.includes("connection"))
		return "network";
	if (lowerMessage.includes("server") || lowerMessage.includes("500"))
		return "server";

	return "unknown";
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
	const errorType = classifyError(error);

	// These error types are generally retryable
	return ["timeout", "network", "server"].includes(errorType);
}

/**
 * Handle errors that occur during streaming setup (before streaming starts)
 * This is focused specifically on setup failures, not streaming errors
 */
export async function handleStreamingSetupError(
	ctx: ActionCtx,
	error: unknown,
	messageId: Id<"messages">,
	modelId: string,
): Promise<void> {
	logStreamingError(error, "StreamingSetup");

	const errorMessage = formatErrorMessage(error);
	const errorDetails = extractErrorDetails(error, "streaming_setup", modelId);

	try {
		// Update message status to error
		await ctx.runMutation(internal.messages.updateMessageStatus, {
			messageId,
			status: "error",
		});

		// Add error part with validated structured details
		await ctx.runMutation(internal.messages.addErrorPart, {
			messageId,
			errorMessage,
			errorDetails,
		});
	} catch (errorHandlingError) {
		console.error(
			"Error during streaming setup error handling:",
			errorHandlingError,
		);
	}
}

/**
 * Create HTTP error response with proper CORS headers and status codes
 * Now uses enhanced error details with validation
 */
export function createHTTPErrorResponse(error: unknown): Response {
	const errorDetails = extractErrorDetails(error, "http_request");
	const errorType = errorDetails.errorType || "unknown";

	// Determine appropriate HTTP status code based on error type
	let status = 500; // Default to internal server error

	switch (errorType) {
		case "auth":
			status = 401; // Unauthorized
			break;
		case "rate_limit":
			status = 429; // Too Many Requests
			break;
		case "quota":
			status = 402; // Payment Required
			break;
		case "timeout":
			status = 408; // Request Timeout
			break;
		case "network":
			status = 503; // Service Unavailable
			break;
		case "server":
			status = 500; // Internal Server Error
			break;
		default:
			status = 500;
	}

	const corsHeaders = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	};

	return new Response(
		JSON.stringify({
			error: formatErrorMessage(error),
			type: errorType,
			retryable: errorDetails.retryable,
			timestamp: errorDetails.timestamp,
			details: {
				name: errorDetails.name,
				// Don't expose sensitive error details to client
				message: errorDetails.message,
				context: errorDetails.context,
			},
		}),
		{
			status,
			headers: {
				"Content-Type": "application/json",
				...corsHeaders,
			},
		},
	);
}

/**
 * Create a standardized error response for client consumption
 * Ensures consistent error format across all endpoints
 */
export function createErrorResponse(
	error: unknown,
	context: ErrorContext = "general",
	modelId?: string,
) {
	const errorDetails = extractErrorDetails(error, context, modelId);
	const userMessage = formatErrorMessage(error);

	return {
		success: false,
		error: {
			message: userMessage,
			type: errorDetails.errorType,
			retryable: errorDetails.retryable,
			timestamp: errorDetails.timestamp,
			context: errorDetails.context,
		},
		// Internal details for debugging (not exposed to client)
		_debug: {
			name: errorDetails.name,
			stack: errorDetails.stack?.substring(0, 200),
		},
	};
}
