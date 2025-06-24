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

// Convert a Convex message to include computed parts in chronological order
export function getMessageParts(message: Doc<"messages">): MessagePart[] {
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

  // Create tool invocation parts
  const toolParts: Array<{ type: "tool-invocation"; toolInvocation: any; sequence: number }> = []
  if (message.toolInvocations && message.toolInvocations.length > 0) {
    for (const invocation of message.toolInvocations) {
      toolParts.push({
        type: "tool-invocation",
        toolInvocation: invocation,
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
      // Flush any accumulated text before adding tool invocation
      if (currentTextGroup) {
        groupedParts.push({
          type: "text",
          text: currentTextGroup,
        })
        currentTextGroup = ""
      }
      
      groupedParts.push({
        type: "tool-invocation",
        toolInvocation: part.toolInvocation,
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

// Helper to check if message has tool invocations
export function hasToolInvocations(message: Doc<"messages">): boolean {
  return !!(message.toolInvocations && message.toolInvocations.length > 0)
}

