"use client"

import type { ToolInvocationPart } from "@/lib/message-parts"
import { GenericToolDisplay } from "./GenericToolDisplay"
import { WebSearchTool } from "./WebSearchTool"

export interface ToolInvocationProps {
  part: ToolInvocationPart
}

export function ToolInvocation({ part }: ToolInvocationProps) {
  const { toolInvocation } = part

  switch (toolInvocation.toolName) {
    case "web_search":
      return <WebSearchTool toolInvocation={toolInvocation} />
    default:
      return <GenericToolDisplay toolInvocation={toolInvocation} />
  }
}

