/**
 * Client-side validation for AI provider API keys.
 * 
 * This file re-exports validation functions from the central schema definition
 * to maintain backward compatibility with existing imports.
 */

import { validateApiKey as validateApiKeyZod, type ModelProvider } from "./schemas"

/**
 * Validates the format of an API key for a given provider.
 * This provides a quick client-side check before making an API call.
 * 
 * @deprecated Use validateApiKey from schemas.ts for better error messages
 */
export function validateApiKeyFormat(
  key: string,
  provider: "openai" | "anthropic" | "openrouter",
): boolean {
  if (!key || typeof key !== "string") return false
  
  const result = validateApiKeyZod(provider as ModelProvider, key)
  return result.success
}

// Re-export the new validation function
export { validateApiKey } from "./schemas"