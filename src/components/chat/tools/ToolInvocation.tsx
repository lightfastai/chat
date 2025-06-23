"use client"

import type { Doc } from "../../../../convex/_generated/dataModel"
import { GenericToolDisplay } from "./GenericToolDisplay"
import { WebSearchTool } from "./WebSearchTool"

export type MessagePart = NonNullable<Doc<"messages">["parts"]>[number]
export type ToolInvocationPart = Extract<
  MessagePart,
  { type: "tool-invocation" }
>

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