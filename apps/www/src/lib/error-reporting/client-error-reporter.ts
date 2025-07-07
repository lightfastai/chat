"use client";

import { useCallback } from "react";

import { env } from "@/env";

import { createSentryReporter } from "./sentry-reporter";
import type { ClientErrorContext } from "./types";

// Create a singleton reporter instance
const reportError = createSentryReporter({
	disableLogger: env.NODE_ENV === "production",
});

export const useErrorReporter = () => {
	return useCallback((context: Omit<ClientErrorContext, "errorType">) => {
		reportError({
			...context,
			errorType: "ClientError",
		});
	}, []);
};
