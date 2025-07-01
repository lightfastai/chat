"use client";

import type { ToolCallPart } from "@/lib/message-parts";
import { GenericToolDisplay } from "./generic-tool-display";
import { WebSearchTool } from "./web-search-tool";

export interface ToolCallRendererProps {
	toolCall: ToolCallPart;
}

export function ToolCallRenderer({ toolCall }: ToolCallRendererProps) {
	// Directly render tool call parts (no legacy conversion needed)
	switch (toolCall.toolName) {
		case "web_search":
			return <WebSearchTool toolCall={toolCall} />;
		default:
			return <GenericToolDisplay toolCall={toolCall} />;
	}
}
