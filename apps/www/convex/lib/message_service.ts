import type { CoreMessage } from "ai";
import { stepCountIs, streamText } from "ai";
import type { ModelId } from "../../src/lib/ai/schemas.js";
import {
	getProviderFromModelId,
	isThinkingMode,
} from "../../src/lib/ai/schemas.js";
import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import type { ActionCtx } from "../_generated/server.js";
import { createAIClient } from "./ai_client.js";
import { createWebSearchTool } from "./ai_tools.js";
import { buildMessageContent, createSystemPrompt } from "./message_builder.js";

/**
 * Generate a unique stream ID
 */
export function generateStreamId(): string {
	return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create initial streaming message
 */
export async function createStreamingMessage(
	ctx: ActionCtx,
	threadId: Id<"threads">,
	modelId: ModelId,
	streamId: string,
	usedUserApiKey: boolean,
): Promise<Id<"messages">> {
	const provider = getProviderFromModelId(modelId);

	return await ctx.runMutation(internal.messages.createStreamingMessage, {
		threadId,
		streamId,
		provider,
		modelId,
		usedUserApiKey,
	});
}

/**
 * Build conversation messages for AI
 */
export async function buildConversationMessages(
	ctx: ActionCtx,
	threadId: Id<"threads">,
	modelId: ModelId,
	attachments?: Id<"files">[],
	webSearchEnabled?: boolean,
): Promise<CoreMessage[]> {
	// Get recent conversation context
	const recentMessages = await ctx.runQuery(
		internal.messages.getRecentContext,
		{ threadId },
	);

	const provider = getProviderFromModelId(modelId);
	const systemPrompt = createSystemPrompt(modelId, webSearchEnabled);

	// Prepare messages for AI SDK v5 with multimodal support
	const messages: CoreMessage[] = [
		{
			role: "system",
			content: systemPrompt,
		},
	];

	// Build conversation history with attachments
	for (let i = 0; i < recentMessages.length; i++) {
		const msg = recentMessages[i];
		const isLastUserMessage =
			i === recentMessages.length - 1 && msg.messageType === "user";

		// For the last user message, include the current attachments
		const attachmentsToUse =
			isLastUserMessage && attachments ? attachments : msg.attachments;

		// Build message content with attachments
		const content = await buildMessageContent(
			ctx,
			msg.body,
			attachmentsToUse,
			provider,
			modelId,
		);

		messages.push({
			role: msg.messageType === "user" ? "user" : "assistant",
			content,
		} as CoreMessage);
	}

	return messages;
}

/**
 * Stream AI response
 */
export async function streamAIResponse(
	ctx: ActionCtx,
	modelId: ModelId,
	messages: CoreMessage[],
	messageId: Id<"messages">,
	userApiKeys: {
		openai?: string;
		anthropic?: string;
		openrouter?: string;
	} | null,
	webSearchEnabled?: boolean,
) {
	const provider = getProviderFromModelId(modelId);
	const aiClient = createAIClient(modelId, userApiKeys);

	// Prepare generation options
	const generationOptions: Parameters<typeof streamText>[0] = {
		model: aiClient,
		messages,
		temperature: 0.7,
	};

	// Add web search tool if enabled
	if (webSearchEnabled) {
		generationOptions.tools = {
			web_search: createWebSearchTool(),
		};
		generationOptions.stopWhen = stepCountIs(5);
	}

	// For Claude 4.0 thinking mode, enable thinking/reasoning
	if (provider === "anthropic" && isThinkingMode(modelId)) {
		generationOptions.providerOptions = {
			anthropic: {
				thinking: {
					type: "enabled",
					budgetTokens: 12000,
				},
			},
		};
	}

	// Use the AI SDK v5 streamText
	const result = streamText(generationOptions);

	let fullText = "";
	let hasContent = false;
	let toolCallsInProgress = 0;

	// Process the stream
	for await (const chunk of result.textStream) {
		if (chunk) {
			fullText += chunk;
			hasContent = true;

			await ctx.runMutation(internal.messages.addTextPart, {
				messageId,
				text: chunk,
			});
		}
	}

	// Process tool calls if web search is enabled
	if (webSearchEnabled) {
		for await (const streamPart of result.fullStream) {
			if (streamPart.type === "tool-call") {
				toolCallsInProgress++;
			}
		}
	}

	// Get final usage with optional chaining
	const finalUsage = await result.usage;

	return {
		fullText,
		hasContent,
		toolCallsInProgress,
		usage: finalUsage,
	};
}

/**
 * Update thread usage with retry logic
 */
export async function updateThreadUsage(
	ctx: ActionCtx,
	threadId: Id<"threads">,
	modelId: ModelId,
	usage:
		| {
				promptTokens?: number;
				inputTokens?: number;
				completionTokens?: number;
				outputTokens?: number;
				totalTokens?: number;
				completionTokensDetails?: { reasoningTokens?: number };
				reasoningTokens?: number;
				promptTokensDetails?: { cachedTokens?: number };
				cachedInputTokens?: number;
		  }
		| null
		| undefined,
) {
	if (!usage) return;

	const promptTokens = usage.promptTokens || usage.inputTokens || 0;
	const completionTokens = usage.completionTokens || usage.outputTokens || 0;
	const totalTokens = usage.totalTokens || promptTokens + completionTokens;

	await ctx.runMutation(internal.messages.updateThreadUsageMutation, {
		threadId,
		usage: {
			promptTokens,
			completionTokens,
			totalTokens,
			reasoningTokens:
				usage.completionTokensDetails?.reasoningTokens ||
				usage.reasoningTokens ||
				0,
			cachedTokens:
				usage.promptTokensDetails?.cachedTokens || usage.cachedInputTokens || 0,
			modelId,
		},
	});
}

/**
 * Clear generation flag
 */
export async function clearGenerationFlag(
	ctx: ActionCtx,
	threadId: Id<"threads">,
) {
	await ctx.runMutation(internal.messages.clearGenerationFlag, {
		threadId,
	});
}
