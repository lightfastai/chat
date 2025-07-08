"use client";

import { isLightfastToolName } from "@lightfast/ai/tools";
import { memo } from "react";
import type {
	DbErrorPart,
	DbToolCallPart,
	DbToolInputStartPart,
	DbToolResultPart,
} from "../../../../convex/types";
import { GenericToolDisplay } from "./generic-tool-display";
import { WebSearchV1_1Tool } from "./web-search-v1-1-tool";
import { WebSearchV1Tool } from "./web-search-v1-tool";

export interface ToolCallRendererProps {
	toolCall: DbToolCallPart | DbToolInputStartPart | DbToolResultPart;
	error?: DbErrorPart;
}

export const ToolCallRenderer = memo(function ToolCallRenderer({
	toolCall,
	error,
}: ToolCallRendererProps) {
	const toolName = toolCall.args.toolName;

	// Use type-safe tool name validation
	if (isLightfastToolName(toolName)) {
		switch (toolName) {
			case "web_search_1_0_0":
				return <WebSearchV1Tool toolCall={toolCall} error={error} />;
			case "web_search_1_1_0":
				return <WebSearchV1_1Tool toolCall={toolCall} error={error} />;
			// Add more tool renderers here as tools are added to the system
			// case "calculator_1_0_0":
			//   return <CalculatorTool toolCall={toolCall} error={error} />;
			default:
				// This should never happen if isLightfastToolName is correct
				return <GenericToolDisplay toolCall={toolCall as DbToolCallPart} />;
		}
	}

	// Unknown tool - use generic display
	return <GenericToolDisplay toolCall={toolCall as DbToolCallPart} />;
});
