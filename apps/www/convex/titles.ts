import { openai } from "@ai-sdk/openai";
import { type CoreMessage, generateText } from "ai";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import { internalAction, internalMutation } from "./_generated/server.js";
import {
	textPartValidator,
	titleValidator,
	validateTitle,
} from "./validators.js";

// Internal action to generate title using fast AI model
// full rewrite to use the new ai sdk v5
export const generateTitle = internalAction({
	args: {
		threadId: v.id("threads"),
		firstMessage: textPartValidator,
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		try {
			console.log(
				"Generating title for message:",
				args.firstMessage.text.substring(0, 100),
			);

			// Use gpt-4o-mini for fast title generation with AI SDK v5
			const messages: CoreMessage[] = [
				{
					role: "system",
					content: `
      - you will generate a short title based on the first message a user begins a conversation with
      - ensure it is not more than 80 characters long
      - the title should be a summary of the user's message
      - do not use quotes or colons`,
				},
				{
					role: "user",
					content: args.firstMessage.text,
				},
			];

			const { text } = await generateText({
				model: openai("gpt-4o-mini"),
				messages,
				temperature: 0.3, // Lower temperature for more consistent titles
			});

			let generatedTitle = text.trim();

			if (generatedTitle) {
				// Ensure generated title doesn't exceed 80 characters
				if (generatedTitle.length > 80) {
					generatedTitle = `${generatedTitle.substring(0, 77)}...`;
				}

				console.log("Generated title:", generatedTitle);

				// Update the thread title
				await ctx.runMutation(internal.titles.updateThreadTitle, {
					threadId: args.threadId,
					title: generatedTitle,
				});
			} else {
				console.warn("Empty title generated, using fallback");
				// Fallback to truncated message if AI fails
				const fallbackTitle =
					args.firstMessage.text.length > 77
						? `${args.firstMessage.text.substring(0, 77)}...`
						: args.firstMessage.text;

				await ctx.runMutation(internal.titles.updateThreadTitle, {
					threadId: args.threadId,
					title: fallbackTitle,
				});
			}
		} catch (error) {
			console.error("Error generating title:", error);

			// Fallback to truncated message on error
			const fallbackTitle =
				args.firstMessage.text.length > 77
					? `${args.firstMessage.text.substring(0, 77)}...`
					: args.firstMessage.text;

			await ctx.runMutation(internal.titles.updateThreadTitle, {
				threadId: args.threadId,
				title: fallbackTitle,
			});
		}

		return null;
	},
});

// Internal mutation to update thread title
export const updateThreadTitle = internalMutation({
	args: {
		threadId: v.id("threads"),
		title: titleValidator,
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		// Validate title length
		if (!validateTitle(args.title)) {
			throw new Error("Title must be between 1 and 80 characters");
		}

		await ctx.db.patch(args.threadId, {
			title: args.title,
		});
		return null;
	},
});
