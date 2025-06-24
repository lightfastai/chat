"use client"

import type {
  MessagePart,
  ToolCallPart,
  ToolInvocationPart,
} from "@/lib/message-parts"
import { GenericToolDisplay } from "./GenericToolDisplay"
import { WebSearchTool } from "./WebSearchTool"

export interface ToolInvocationProps {
  part: MessagePart
}

export function ToolInvocation({ part }: ToolInvocationProps) {
  // Handle new tool-call parts
  if (part.type === "tool-call") {
    const toolCallPart = part as ToolCallPart

    // Create a legacy-compatible structure for existing components
    const legacyToolInvocation = {
      state: toolCallPart.state,
      toolCallId: toolCallPart.toolCallId,
      toolName: toolCallPart.toolName,
      args: toolCallPart.args,
    }

    switch (toolCallPart.toolName) {
      case "web_search":
        return <WebSearchTool toolInvocation={legacyToolInvocation} />
      default:
        return <GenericToolDisplay toolInvocation={legacyToolInvocation} />
    }
  }

  // Handle legacy tool-invocation parts
  if (part.type === "tool-invocation") {
    const legacyPart = part as ToolInvocationPart
    const { toolInvocation } = legacyPart

    switch (toolInvocation.toolName) {
      case "web_search":
        return <WebSearchTool toolInvocation={toolInvocation} />
      default:
        return <GenericToolDisplay toolInvocation={toolInvocation} />
    }
  }

  // Handle other part types (shouldn't happen but be safe)
  return null
}
