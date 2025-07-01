import { openai } from "@ai-sdk/openai"
import { type CoreMessage, generateText } from "ai"
import { v } from "convex/values"
import { internal } from "./_generated/api.js"
import { internalAction, internalMutation } from "./_generated/server.js"
import { titleValidator, validateTitle } from "./validators.js"

// Internal action to generate title using fast AI model
export const generateTitle = internalAction({
  args: {
    threadId: v.id("threads"),
    userMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Mark title as generating
      await ctx.runMutation(internal.titles.setTitleGenerating, {
        threadId: args.threadId,
        isGenerating: true,
      })

      console.log(
        "Generating title for message:",
        args.userMessage.substring(0, 100),
      )

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
          content: args.userMessage,
        },
      ]

      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        messages,
        temperature: 0.3, // Lower temperature for more consistent titles
      })

      let generatedTitle = text.trim()

      if (generatedTitle) {
        // Ensure generated title doesn't exceed 80 characters
        if (generatedTitle.length > 80) {
          generatedTitle = `${generatedTitle.substring(0, 77)}...`
        }

        console.log("Generated title:", generatedTitle)

        // Update the thread title
        await ctx.runMutation(internal.titles.updateThreadTitle, {
          threadId: args.threadId,
          title: generatedTitle,
        })
      } else {
        console.warn("Empty title generated, using fallback")
        // Fallback to truncated message if AI fails
        const fallbackTitle =
          args.userMessage.length > 77
            ? `${args.userMessage.substring(0, 77)}...`
            : args.userMessage

        await ctx.runMutation(internal.titles.updateThreadTitle, {
          threadId: args.threadId,
          title: fallbackTitle,
        })
      }
    } catch (error) {
      console.error("Error generating title:", error)

      // Fallback to truncated message on error
      const fallbackTitle =
        args.userMessage.length > 77
          ? `${args.userMessage.substring(0, 77)}...`
          : args.userMessage

      await ctx.runMutation(internal.titles.updateThreadTitle, {
        threadId: args.threadId,
        title: fallbackTitle,
      })
    }

    return null
  },
})

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
      throw new Error("Title must be between 1 and 80 characters")
    }

    await ctx.db.patch(args.threadId, {
      title: args.title,
      isTitleGenerating: false,
    })
    return null
  },
})

// Internal mutation to set title generating status
export const setTitleGenerating = internalMutation({
  args: {
    threadId: v.id("threads"),
    isGenerating: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, {
      isTitleGenerating: args.isGenerating,
    })
    return null
  },
})
