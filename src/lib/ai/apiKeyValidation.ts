/**
 * Client-side validation for AI provider API keys.
 */

/**
 * Validates the format of an API key for a given provider.
 * This provides a quick client-side check before making an API call.
 */
export function validateApiKeyFormat(
  key: string,
  provider: "openai" | "anthropic" | "openrouter",
): boolean {
  if (!key || typeof key !== "string") return false

  switch (provider) {
    case "openai":
      // OpenAI keys: sk-* (legacy ~51 chars) or sk-proj-* (project keys ~156 chars)
      // Modern keys can be 130-160+ characters total with hyphens allowed
      return (
        /^sk-[a-zA-Z0-9-]{20,}$/.test(key) ||
        /^sk-proj-[a-zA-Z0-9-]{100,}$/.test(key)
      )
    case "anthropic":
      // Anthropic keys start with `sk-ant-` and are significantly longer.
      // This regex checks for the prefix and a reasonable length of characters.
      return /^sk-ant-[a-zA-Z0-9_-]{95,}$/.test(key)
    case "openrouter":
      // OpenRouter keys start with `sk-or-` followed by alphanumeric and hyphen characters
      return /^sk-or-[a-zA-Z0-9-]{20,}$/.test(key)
    default:
      return false
  }
}
