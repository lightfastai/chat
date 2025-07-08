import type { ModelProvider } from "./schemas";

/**
 * Provider icon mappings for UI display
 * Maps each AI provider to their respective icon component name
 */
export const PROVIDER_ICONS: Record<ModelProvider, string> = {
  openai: "openai",
  anthropic: "anthropic",
  openrouter: "openrouter",
} as const;

/**
 * Provider display names for UI
 */
export const PROVIDER_DISPLAY_NAMES: Record<ModelProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
} as const;

/**
 * Provider color mappings for UI theming
 * These can be used for badges, borders, or backgrounds
 */
export const PROVIDER_COLORS: Record<ModelProvider, string> = {
  openai: "#10a37f", // OpenAI green
  anthropic: "#d97757", // Anthropic orange
  openrouter: "#6366f1", // OpenRouter purple/indigo
} as const;

/**
 * Get provider icon by provider ID
 */
export function getProviderIcon(provider: ModelProvider): string {
  return PROVIDER_ICONS[provider];
}

/**
 * Get provider display name by provider ID
 */
export function getProviderDisplayName(provider: ModelProvider): string {
  return PROVIDER_DISPLAY_NAMES[provider];
}

/**
 * Get provider color by provider ID
 */
export function getProviderColor(provider: ModelProvider): string {
  return PROVIDER_COLORS[provider];
}