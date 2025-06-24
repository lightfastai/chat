import { ActionRetrier } from "@convex-dev/action-retrier"
import { components } from "../_generated/api.js"

// Create a retrier instance with custom configuration for computer instance readiness
export const computerRetrier = new ActionRetrier(components.actionRetrier, {
  initialBackoffMs: 1000, // Start with 1 second delay
  base: 2, // Exponential backoff base
  maxFailures: 30, // Max 30 retries (same as our current implementation)
})