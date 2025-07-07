import { env } from "@/env";

import { createSentryReporter } from "./sentry-reporter";
import type { ApiErrorContext } from "./types";

// Create a singleton reporter instance for API errors
const reportError = createSentryReporter({
	disableLogger: env.NODE_ENV === "production",
});

export const reportApiError = (context: Omit<ApiErrorContext, "errorType">) => {
	reportError({
		...context,
		errorType: "ApiError",
	});
};
