import { ConvexError } from "convex/values";

/**
 * Standard error codes for the application
 */
export const ErrorCode = {
	UNAUTHORIZED: "UNAUTHORIZED",
	NOT_FOUND: "NOT_FOUND",
	INVALID_INPUT: "INVALID_INPUT",
	RATE_LIMITED: "RATE_LIMITED",
	INTERNAL_ERROR: "INTERNAL_ERROR",
	PERMISSION_DENIED: "PERMISSION_DENIED",
	CONFLICT: "CONFLICT",
	GENERATION_IN_PROGRESS: "GENERATION_IN_PROGRESS",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Throw a standardized authentication error
 */
export function throwAuthError(message = "User must be authenticated"): never {
	throw new ConvexError({
		code: ErrorCode.UNAUTHORIZED,
		message,
	});
}

/**
 * Throw a standardized not found error
 */
export function throwNotFoundError(resource: string, message?: string): never {
	throw new ConvexError({
		code: ErrorCode.NOT_FOUND,
		message: message || `${resource} not found`,
	});
}

/**
 * Throw a standardized permission error
 */
export function throwPermissionError(message = "Permission denied"): never {
	throw new ConvexError({
		code: ErrorCode.PERMISSION_DENIED,
		message,
	});
}

/**
 * Throw a standardized conflict error
 */
export function throwConflictError(message: string): never {
	throw new ConvexError({
		code: ErrorCode.CONFLICT,
		message,
	});
}

/**
 * Throw a standardized rate limit error
 */
export function throwRateLimitError(message = "Rate limit exceeded"): never {
	throw new ConvexError({
		code: ErrorCode.RATE_LIMITED,
		message,
	});
}

/**
 * Check if user is authenticated and throw if not
 */
export function requireAuth<T>(
	userId: T | null | undefined,
): asserts userId is T {
	if (!userId) {
		throwAuthError();
	}
}

/**
 * Check if resource exists and throw if not
 */
export function requireResource<T>(
	resource: T | null | undefined,
	resourceName: string,
): asserts resource is T {
	if (!resource) {
		throwNotFoundError(resourceName);
	}
}

/**
 * Check if user has access to resource
 */
export function requireAccess(
	condition: boolean,
	message = "Access denied",
): asserts condition {
	if (!condition) {
		throwPermissionError(message);
	}
}
