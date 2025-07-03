import type { Infer } from "convex/values";
import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import type { ActionCtx } from "../_generated/server.js";
import type {
	modelIdValidator,
	modelProviderValidator,
} from "../validators.js";

/**
 * Handle errors in AI response generation with proper cleanup
 * Ensures generation flag is always cleared to prevent thread lock
 */
export async function handleAIResponseError(
	ctx: ActionCtx,
	error: unknown,
	threadId: Id<"threads">,
	messageId?: Id<"messages">,
	options?: {
		modelId?: string;
		provider?: string;
		useStreamingUpdate?: boolean;
	},
): Promise<void> {
	console.error("Error in AI response generation:", error);

	// Add specific error details for debugging
	if (error instanceof Error) {
		console.error(`Error name: ${error.name}`);
		console.error(`Error message: ${error.message}`);
		if (error.stack) {
			console.error(`Error stack: ${error.stack.substring(0, 500)}...`);
		}
	}

	const errorMessage = `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}. Please check your API keys.`;

	try {
		if (messageId && options?.useStreamingUpdate) {
			// For streaming messages, mark as error
			await ctx.runMutation(internal.messages.markError, {
				messageId,
				error: errorMessage,
			});
		} else if (messageId) {
			// Update existing message with error
			await ctx.runMutation(internal.messages.updateMessageError, {
				messageId,
				errorMessage,
			});
		} else if (options?.provider) {
			// Create new error message
			await ctx.runMutation(internal.messages.createErrorMessage, {
				threadId,
				provider: options.provider as Infer<typeof modelProviderValidator>,
				modelId: options.modelId as Infer<typeof modelIdValidator>,
				errorMessage,
			});
		}
	} catch (errorHandlingError) {
		console.error("Error during error handling:", errorHandlingError);
	}
}
