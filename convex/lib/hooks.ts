import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server"

// Configuration for timing middleware
export const TIMING_CONFIG = {
  // Enable timing logs and artificial delays
  enabled:
    process.env.CONVEX_TIMING_ENABLED === "true" ||
    process.env.NODE_ENV === "development",
  // Min and max artificial delay in milliseconds
  minDelay: 100,
  maxDelay: 500,
  // Enable console logging
  logging: true,
}

// Timing hook for development - adds artificial delay and logs execution time
export async function withDevTiming<T>(
  functionType:
    | "Query"
    | "Mutation"
    | "Action"
    | "InternalQuery"
    | "InternalMutation"
    | "InternalAction",
  functionName: string,
  fn: () => Promise<T>,
): Promise<T> {
  // Skip if not enabled
  if (!TIMING_CONFIG.enabled) {
    return fn()
  }

  const start = Date.now()

  // Add artificial delay to simulate production latency
  const delayRange = TIMING_CONFIG.maxDelay - TIMING_CONFIG.minDelay
  const waitMs = Math.floor(Math.random() * delayRange) + TIMING_CONFIG.minDelay
  await new Promise((resolve) => setTimeout(resolve, waitMs))

  try {
    const result = await fn()
    const duration = Date.now() - start
    const executionTime = duration - waitMs

    if (TIMING_CONFIG.logging) {
      // Log with color coding based on total duration
      const color =
        duration < 300 ? "\x1b[32m" : duration < 600 ? "\x1b[33m" : "\x1b[31m"
      const reset = "\x1b[0m"
      console.info(
        `${color}[Convex ${functionType}]${reset} ${functionName} - Total: ${color}${duration}ms${reset} (Execution: ${executionTime}ms + Delay: ${waitMs}ms)`,
      )
    }

    return result
  } catch (error) {
    const duration = Date.now() - start

    if (TIMING_CONFIG.logging) {
      console.error(
        `\x1b[31m[Convex ${functionType} ERROR]\x1b[0m ${functionName} failed after ${duration}ms`,
        error,
      )
    }
    throw error
  }
}

// Helper to wrap query handlers
export function wrapQuery<Args extends Record<string, unknown>, Output>(
  name: string,
  handler: (ctx: QueryCtx, args: Args) => Promise<Output>,
): (ctx: QueryCtx, args: Args) => Promise<Output> {
  return async (ctx: QueryCtx, args: Args): Promise<Output> => {
    return withDevTiming("Query", name, () => handler(ctx, args))
  }
}

// Helper to wrap mutation handlers
export function wrapMutation<Args extends Record<string, unknown>, Output>(
  name: string,
  handler: (ctx: MutationCtx, args: Args) => Promise<Output>,
): (ctx: MutationCtx, args: Args) => Promise<Output> {
  return async (ctx: MutationCtx, args: Args): Promise<Output> => {
    return withDevTiming("Mutation", name, () => handler(ctx, args))
  }
}

// Helper to wrap action handlers
export function wrapAction<Args extends Record<string, unknown>, Output>(
  name: string,
  handler: (ctx: ActionCtx, args: Args) => Promise<Output>,
): (ctx: ActionCtx, args: Args) => Promise<Output> {
  return async (ctx: ActionCtx, args: Args): Promise<Output> => {
    return withDevTiming("Action", name, () => handler(ctx, args))
  }
}

// Helper to wrap internal query handlers
export function wrapInternalQuery<Args extends Record<string, unknown>, Output>(
  name: string,
  handler: (ctx: QueryCtx, args: Args) => Promise<Output>,
): (ctx: QueryCtx, args: Args) => Promise<Output> {
  return async (ctx: QueryCtx, args: Args): Promise<Output> => {
    return withDevTiming("InternalQuery", name, () => handler(ctx, args))
  }
}

// Helper to wrap internal mutation handlers
export function wrapInternalMutation<
  Args extends Record<string, unknown>,
  Output,
>(
  name: string,
  handler: (ctx: MutationCtx, args: Args) => Promise<Output>,
): (ctx: MutationCtx, args: Args) => Promise<Output> {
  return async (ctx: MutationCtx, args: Args): Promise<Output> => {
    return withDevTiming("InternalMutation", name, () => handler(ctx, args))
  }
}

// Helper to wrap internal action handlers
export function wrapInternalAction<
  Args extends Record<string, unknown>,
  Output,
>(
  name: string,
  handler: (ctx: ActionCtx, args: Args) => Promise<Output>,
): (ctx: ActionCtx, args: Args) => Promise<Output> {
  return async (ctx: ActionCtx, args: Args): Promise<Output> => {
    return withDevTiming("InternalAction", name, () => handler(ctx, args))
  }
}
