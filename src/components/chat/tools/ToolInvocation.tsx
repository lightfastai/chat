"use client"

import type { Doc } from "../../../../convex/_generated/dataModel"
import { GenericToolDisplay } from "./GenericToolDisplay"
import { WebSearchTool } from "./WebSearchTool"

export type MessagePart = NonNullable<Doc<"messages">["parts"]>[number]

// Define a concrete interface for tool invocation parts
export interface ToolInvocationPart {
  type: "tool-invocation"
  toolCallId?: string
  toolName?: string
  args?: any
  state?: "partial-call" | "call" | "result" | "error"
  result?: any
  error?: string
}

export interface ToolInvocationProps {
  part: ToolInvocationPart
}

export function ToolInvocation({ part }: ToolInvocationProps) {
  switch (part.toolName) {
    case "web_search":
      return <WebSearchTool part={part} />
    default:
      return <GenericToolDisplay part={part} />
  }
}