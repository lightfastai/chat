import { captureRequestError, init } from "@sentry/nextjs"

import { env } from "@/env"

const register = () => {
  // Only initialize if DSN is provided
  if (!env.NEXT_PUBLIC_SENTRY_DSN) {
    return
  }

  // eslint-disable-next-line turbo/no-undeclared-env-vars, no-restricted-properties
  if (process.env.NEXT_RUNTIME === "nodejs") {
    init({
      dsn: env.NEXT_PUBLIC_SENTRY_DSN,
      environment: env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
      tracesSampleRate: 1,
      debug: false,
    })
  }

  // eslint-disable-next-line turbo/no-undeclared-env-vars, no-restricted-properties
  if (process.env.NEXT_RUNTIME === "edge") {
    init({
      dsn: env.NEXT_PUBLIC_SENTRY_DSN,
      environment: env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
      tracesSampleRate: 1,
      debug: false,
    })
  }
}

register()

export const onRequestError = captureRequestError
