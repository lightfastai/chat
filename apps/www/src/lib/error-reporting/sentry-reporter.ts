import * as Sentry from "@sentry/nextjs";

import type { ErrorContext, ErrorReportingConfig } from "./types";

export const createSentryReporter = (config?: ErrorReportingConfig) => {
	const disableLogger = config?.disableLogger ?? false;

	return (context: ErrorContext) => {
		try {
			if (!disableLogger) {
				console.error(`[${context.errorType}] ${context.message}`, {
					...context,
					timestamp: new Date().toISOString(),
				});
			}

			// Set Sentry context
			Sentry.setContext("error_details", {
				errorType: context.errorType,
				requestId: context.requestId,
				metadata: context.metadata,
			});

			// Set tags for better filtering in Sentry
			Sentry.setTag("error.type", context.errorType);
			if (context.requestId) {
				Sentry.setTag("request.id", context.requestId);
			}

			// Capture the exception
			Sentry.captureException(new Error(context.error), {
				extra: {
					...context,
					// Ensure all properties are serializable
					errorType: context.errorType,
					requestId: context.requestId || undefined,
					message: context.message,
					metadata: context.metadata || undefined,
				},
			});
		} catch (error) {
			// Fail silently if Sentry reporting fails
			if (!disableLogger) {
				console.error("Failed to report error to Sentry:", error);
			}
		}
	};
};
