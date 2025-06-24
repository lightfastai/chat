import type { Doc } from "../../convex/_generated/dataModel"

// Types matching Vercel AI SDK v5 structure and new schema
export type TextPart = {
  type: "text"
  text: string
}

export type ToolCallPart = {
  type: "tool-call"
  toolCallId: string
  toolName: string
  args?: any
  state: "partial-call" | "call" | "result" | "error"
}

export type ToolResultPart = {
  type: "tool-result"
  toolCallId: string
  result: any
}

// Legacy type for backward compatibility
export type ToolInvocationPart = {
  type: "tool-invocation"
  toolInvocation: {
    state: "partial-call" | "call" | "result" | "error"
    toolCallId: string
    toolName: string
    args?: any
    result?: any
    error?: string
  }
}

export type MessagePart =
  | TextPart
  | ToolCallPart
  | ToolResultPart
  | ToolInvocationPart

// Get message parts with backward compatibility and text grouping
export function getMessageParts(message: Doc<"messages">): MessagePart[] {
  let parts: MessagePart[]

  // If the message has the new parts array, use it
  if (message.parts && message.parts.length > 0) {
    parts = message.parts as MessagePart[]
  } else {
    // Backward compatibility: convert legacy toolInvocations to parts
    parts = convertLegacyToModernParts(message)
  }

  // Group consecutive text parts together to prevent line breaks
  return groupConsecutiveTextParts(parts)
}

// Group consecutive text parts together to prevent line breaks between chunks
function groupConsecutiveTextParts(parts: MessagePart[]): MessagePart[] {
  const groupedParts: MessagePart[] = []
  let currentTextGroup = ""

  for (const part of parts) {
    if (part.type === "text") {
      currentTextGroup += part.text
    } else {
      // Flush any accumulated text before adding non-text part
      if (currentTextGroup) {
        groupedParts.push({
          type: "text",
          text: currentTextGroup,
        })
        currentTextGroup = ""
      }

      // Add the non-text part
      groupedParts.push(part)
    }
  }

  // Don't forget to add any remaining text at the end
  if (currentTextGroup) {
    groupedParts.push({
      type: "text",
      text: currentTextGroup,
    })
  }

  return groupedParts
}

// Convert legacy message structure to modern parts format
function convertLegacyToModernParts(message: Doc<"messages">): MessagePart[] {
  // Create text parts from stream chunks if available (for streaming messages)
  const textParts: Array<{ type: "text"; text: string; sequence: number }> = []
  if (message.streamChunks && message.streamChunks.length > 0) {
    // Use individual chunks to preserve chronological order
    for (const chunk of message.streamChunks) {
      textParts.push({
        type: "text",
        text: chunk.content,
        sequence: chunk.sequence || 0,
      })
    }
  } else if (message.body) {
    // Fallback for non-streaming messages - assign sequence 0
    textParts.push({
      type: "text",
      text: message.body,
      sequence: 0,
    })
  }

  // Create tool call parts from legacy toolInvocations
  const toolParts: Array<{
    type: "tool-call"
    toolCallId: string
    toolName: string
    args?: any
    state: "partial-call" | "call" | "result" | "error"
    sequence: number
  }> = []
  if (message.toolInvocations && message.toolInvocations.length > 0) {
    for (const invocation of message.toolInvocations) {
      toolParts.push({
        type: "tool-call",
        toolCallId: invocation.toolCallId,
        toolName: invocation.toolName,
        args: invocation.args,
        state: invocation.state,
        sequence: invocation.sequence || 0,
      })
    }
  }

  // Combine and sort all parts by sequence number
  const allParts = [...textParts, ...toolParts]
  allParts.sort((a, b) => a.sequence - b.sequence)

  // Convert to MessagePart format (grouping will be handled by caller)
  return allParts.map((part): MessagePart => {
    if (part.type === "text") {
      return {
        type: "text",
        text: part.text,
      }
    } else {
      return {
        type: "tool-call",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        args: part.args,
        state: part.state,
      }
    }
  })
}

// Helper to check if message has tool invocations (supports both new and legacy)
export function hasToolInvocations(message: Doc<"messages">): boolean {
  // Check new parts array first
  if (message.parts && message.parts.length > 0) {
    return message.parts.some(
      (part) => part.type === "tool-call" || part.type === "tool-result",
    )
  }

  // Fallback to legacy toolInvocations
  return !!(message.toolInvocations && message.toolInvocations.length > 0)
}

// Helper to convert a tool-call part to legacy format for backward compatibility
export function convertToolCallToLegacy(
  toolCallPart: ToolCallPart,
): ToolInvocationPart {
  return {
    type: "tool-invocation",
    toolInvocation: {
      state: toolCallPart.state,
      toolCallId: toolCallPart.toolCallId,
      toolName: toolCallPart.toolName,
      args: toolCallPart.args,
    },
  }
}
