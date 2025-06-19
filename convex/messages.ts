/**
 * Messages API
 *
 * This file re-exports all message-related functionality from the modular structure.
 * The implementation has been split into separate files for better organization:
 *
 * - messages/queries.ts - All query handlers
 * - messages/mutations.ts - All mutation handlers
 * - messages/actions.ts - All action handlers
 * - messages/helpers.ts - Shared helper functions
 * - messages/types.ts - Type definitions
 * - messages/tools.ts - AI tools (web search, etc.)
 */

// Export all queries
export {
  list,
  listByClientId,
  getThreadUsage,
  getStreamChunks,
  // Internal queries
  getRecentContext,
  getThreadById,
} from "./messages/queries.js"

// Export all mutations
export {
  send,
  createThreadAndSend,
  // Internal mutations
  createStreamingMessage,
  appendStreamChunk,
  updateStreamingMessage,
  updateMessageApiKeyStatus,
  updateThreadUsageMutation,
  updateMessageError,
  completeStreamingMessage,
  completeStreamingMessageLegacy,
  createErrorMessage,
  updateThinkingState,
  updateThinkingContent,
  clearGenerationFlag,
} from "./messages/mutations.js"

// Export all actions
export {
  generateAIResponse,
  generateAIResponseWithMessage,
} from "./messages/actions.js"

// Export types
export type {
  MessageUsageUpdate,
  FormattedUsage,
  AISDKUsage,
} from "./messages/types.js"