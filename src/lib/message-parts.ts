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

// Get message parts with backward compatibility
export function getMessageParts(message: Doc<"messages">): MessagePart[] {
  // If the message has the new parts array, use it directly
  if (message.parts && message.parts.length > 0) {
    return message.parts as MessagePart[]
  }

  // Backward compatibility: convert legacy toolInvocations to parts
  return convertLegacyToModernParts(message)
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

  // Group consecutive text parts together
  const groupedParts: MessagePart[] = []
  let currentTextGroup = ""

  for (const part of allParts) {
    if (part.type === "text") {
      currentTextGroup += part.text
    } else {
      // Flush any accumulated text before adding tool call
      if (currentTextGroup) {
        groupedParts.push({
          type: "text",
          text: currentTextGroup,
        })
        currentTextGroup = ""
      }

      groupedParts.push({
        type: "tool-call",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        args: part.args,
        state: part.state,
      })
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
