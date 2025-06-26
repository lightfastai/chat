import { type ModelId, getModelById } from "../../src/lib/ai/schemas.js";

/**
 * Create system prompt based on model capabilities
 * Single source of truth for system prompt generation
 */
export function createSystemPrompt(
	modelId: ModelId,
	webSearchEnabled = false,
): string {
	let systemPrompt =
		"You are a helpful AI assistant in a chat conversation. Be concise and friendly.";

	// Code formatting instructions
	systemPrompt +=
		"\n\nWhen providing code examples, always use proper syntax highlighting in code blocks. For JavaScript, Node.js, React, or TypeScript code, use:\n```javascript\n// Your code here\n```\n\nFor other languages, specify the appropriate language identifier (e.g., ```python, ```css, ```bash, ```sql, etc.) to ensure proper syntax highlighting and readability.";

	// Check model capabilities
	const modelConfig = getModelById(modelId);
	const hasVisionSupport = modelConfig?.features.vision ?? false;
	const hasPdfSupport = modelConfig?.features.pdfSupport ?? false;

	if (hasVisionSupport) {
		if (hasPdfSupport) {
			// Claude models with both vision and PDF support
			systemPrompt +=
				" You can view and analyze images (JPEG, PNG, GIF, WebP) and PDF documents directly. For other file types, you'll receive a text description. When users ask about an attached file, provide detailed analysis of what you can see.";
		} else {
			// GPT-4 models with vision but no PDF support
			systemPrompt +=
				" You can view and analyze images (JPEG, PNG, GIF, WebP) directly. For PDFs and other file types, you'll receive a text description. When asked about a PDF, politely explain that you can see it's attached but cannot analyze its contents - suggest using Claude models for PDF analysis. For images, provide detailed analysis of what you can see.";
		}
	} else {
		// Models without vision support (e.g., GPT-3.5 Turbo)
		systemPrompt += ` IMPORTANT: You cannot view images or files directly with ${modelConfig?.displayName || "this model"}. When users share files and ask about them, you must clearly state: 'I can see you've uploaded [filename], but I'm unable to view or analyze images with ${modelConfig?.displayName || "this model"}. To analyze images or documents, please switch to GPT-4o, GPT-4o Mini, or any Claude model using the model selector below the input box.' Be helpful by acknowledging what files they've shared based on the descriptions you receive.`;
	}

	if (webSearchEnabled) {
		systemPrompt += `\n\nYou have web search capabilities. You should proactively search for information when needed to provide accurate, current answers.

CRITICAL INSTRUCTIONS FOR WEB SEARCH:

When you perform a web search, you MUST ALWAYS automatically continue with a thorough analysis. Never stop after just showing search results. Follow this exact pattern:

1. **Search Intent** (before searching): Briefly state what specific information you're seeking and why it's relevant to the user's question.

2. **Search Execution**: Perform the web search using the web_search tool.

3. **MANDATORY Immediate Analysis** (after search results appear): You MUST automatically provide ALL of the following without waiting:
   - **Key Findings Summary**: Extract and explain the most important information from each source
   - **Detailed Explanation**: Thoroughly explain what you found, making complex information easy to understand
   - **Cross-Source Analysis**: Compare information across sources, noting agreements and disagreements
   - **Information Quality**: Assess source credibility, publication dates, and relevance
   - **Knowledge Synthesis**: Combine findings with your existing knowledge for a complete picture

4. **Comprehensive Answer**: Always conclude with:
   - A clear, detailed answer to the user's original question
   - Specific examples and data points from the search results
   - [Source N] citations for all factual claims
   - Suggestions for follow-up searches if any aspects remain unclear

REMEMBER: 
- NEVER just list search results without explanation
- ALWAYS provide detailed analysis and explanation automatically
- The user should receive a complete, well-explained answer after each search
- If you need more information, perform additional searches proactively
- Your goal is to fully answer the question, not just find information`;
	}

	return systemPrompt;
}
