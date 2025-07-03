/**
 * Error handling utilities for the chat application
 *
 * This module provides small, composable functions for handling different types
 * of errors in the streaming infrastructure. Each function has a single responsibility
 * and can be easily tested and reused.
 */

import type { Id } from "../_generated/dataModel.js";
import type { ActionCtx } from "../_generated/server.js";
import { internal } from "../_generated/api.js";

interface ErrorDetails {
  name: string;
  message: string;
  stack?: string;
  raw: unknown;
}

/**
 * Extract structured error details from any error type
 */
export function extractErrorDetails(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      raw: error,
    };
  }

  return {
    name: "Unknown Error",
    message: String(error),
    stack: undefined,
    raw: error,
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
  
  if (details.message.toLowerCase().includes("unauthorized") || 
      details.message.toLowerCase().includes("api key")) {
    return "Authentication error. Please check your API keys in settings.";
  }
  
  if (details.message.toLowerCase().includes("quota") || 
      details.message.toLowerCase().includes("billing")) {
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
  } else if (details.message.toLowerCase().includes("unauthorized") || 
             details.message.toLowerCase().includes("api key")) {
    console.error(`${contextPrefix}Authentication error:`, error);
  } else if (details.message.toLowerCase().includes("quota") || 
             details.message.toLowerCase().includes("billing")) {
    console.error(`${contextPrefix}Quota/billing error:`, error);
  } else {
    console.error(`${contextPrefix}Streaming error:`, error);
  }

  // Always log error details for debugging
  console.error(`Error details - Name: ${details.name}, Message: ${details.message}`);
  if (details.stack) {
    console.error(`Stack trace: ${details.stack.substring(0, 500)}...`);
  }
}

/**
 * Classify error type for monitoring and handling
 */
export function classifyError(error: unknown): string {
  const details = extractErrorDetails(error);
  const message = details.message.toLowerCase();
  
  if (message.includes("rate limit")) return "rate_limit";
  if (message.includes("timeout")) return "timeout";
  if (message.includes("unauthorized") || message.includes("api key")) return "auth";
  if (message.includes("quota") || message.includes("billing")) return "quota";
  if (message.includes("network") || message.includes("connection")) return "network";
  if (message.includes("server") || message.includes("500")) return "server";
  
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
  const errorDetails = extractErrorDetails(error);
  
  try {
    // Update message status to error
    await ctx.runMutation(internal.messages.updateMessageStatus, {
      messageId,
      status: "error",
    });
    
    // Add error part with details for debugging
    await ctx.runMutation(internal.messages.addErrorPart, {
      messageId,
      errorMessage,
      errorDetails: {
        ...errorDetails,
        context: "streaming_setup",
        modelId,
      },
    });
  } catch (errorHandlingError) {
    console.error("Error during streaming setup error handling:", errorHandlingError);
  }
}

/**
 * Create HTTP error response with proper CORS headers and status codes
 */
export function createHTTPErrorResponse(error: unknown): Response {
  const errorDetails = extractErrorDetails(error);
  const errorType = classifyError(error);
  
  // Determine appropriate HTTP status code
  let status = 500; // Default to internal server error
  
  if (errorType === "auth") {
    status = 401;
  } else if (errorType === "rate_limit") {
    status = 429;
  } else if (errorType === "quota") {
    status = 402; // Payment required
  } else if (errorType === "timeout") {
    status = 408; // Request timeout
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
      details: {
        name: errorDetails.name,
        // Don't expose sensitive error details to client
        message: errorDetails.message,
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