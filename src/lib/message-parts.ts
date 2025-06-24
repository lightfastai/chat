import type { Doc } from "../../convex/_generated/dataModel"

// Types matching Vercel AI SDK v5 structure
export type TextPart = {
  type: "text"
  text: string
}

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

export type MessagePart = TextPart | ToolInvocationPart

// Convert a Convex message to include computed parts
export function getMessageParts(message: Doc<"messages">): MessagePart[] {
  const parts: MessagePart[] = []

  // Add tool invocations if present
  if (message.toolInvocations && message.toolInvocations.length > 0) {
    for (const invocation of message.toolInvocations) {
      parts.push({
        type: "tool-invocation",
        toolInvocation: invocation,
      })
    }
  }

  // Add text content if present
  if (message.body) {
    parts.push({
      type: "text",
      text: message.body,
    })
  }

  return parts
}

// Helper to check if message has tool invocations
export function hasToolInvocations(message: Doc<"messages">): boolean {
  return !!(message.toolInvocations && message.toolInvocations.length > 0)
}

