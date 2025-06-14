/**
 * Client-side validation for AI provider API keys.
 */

/**
 * Validates the format of an API key for a given provider.
 * This provides a quick client-side check before making an API call.
 */
export function validateApiKeyFormat(
  key: string,
  provider: "openai" | "anthropic",
): boolean {
  if (!key || typeof key !== "string") return false

  switch (provider) {
    case "openai":
      // OpenAI keys start with `sk-` and are followed by 48 alphanumeric characters.
      return /^sk-[a-zA-Z0-9]{48}$/.test(key)
    case "anthropic":
      // Anthropic keys start with `sk-ant-` and are significantly longer.
      // This regex checks for the prefix and a reasonable length of characters.
      return /^sk-ant-[a-zA-Z0-9_-]{95,}$/.test(key)
    default:
      return false
  }
}
