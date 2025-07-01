// Base error context that all errors must include
export interface BaseErrorContext {
	errorType: string;
	requestId?: string;
	error: string;
	message: string;
	metadata?: Record<string, unknown>;
}

// Client-specific context
export interface ClientErrorContext extends BaseErrorContext {
	component: string;
}

// API-specific context
export interface ApiErrorContext extends BaseErrorContext {
	route: string;
}

// Union type for all possible error contexts
export type ErrorContext = ClientErrorContext | ApiErrorContext;

// Shared configuration for error reporting
export interface ErrorReportingConfig {
	disableLogger?: boolean;
}
