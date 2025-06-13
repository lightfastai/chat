import { createOpenAI, openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { v } from "convex/values"
import { internal } from "./_generated/api.js"
import { internalAction, internalMutation } from "./_generated/server.js"

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

      // Get thread to find user ID
      const thread = await ctx.runQuery(internal.messages.getThreadById, {
        threadId: args.threadId,
      })

      if (!thread) {
        throw new Error("Thread not found")
      }

      // Get user's API keys if available
      const userApiKeys = await ctx.runMutation(
        internal.userSettings.getDecryptedApiKeys,
        { userId: thread.userId },
      )

      // Use user's OpenAI key if available, otherwise fall back to global
      const model = userApiKeys?.openai
        ? createOpenAI({ apiKey: userApiKeys.openai })("gpt-4o-mini")
        : openai("gpt-4o-mini")

      // Use gpt-4o-mini for fast title generation with AI SDK v5
      const { text } = await generateText({
        model,
        messages: [
          {
            role: "system",
            content: `Generate a concise, descriptive title (3-6 words) for a chat conversation based on the user's first message. The title should capture the main topic or intent. Return only the title, no quotes or extra text.

Examples:
- "How do I learn React?" → "Learning React Development"
- "Write a poem about cats" → "Cat Poetry Request"
- "Explain quantum physics" → "Quantum Physics Explanation"
- "Help me plan a trip" → "Travel Planning Help"`,
          },
          {
            role: "user",
            content: args.userMessage,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent titles
      })

      const generatedTitle = text.trim()

      if (generatedTitle) {
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
          args.userMessage.length > 50
            ? `${args.userMessage.substring(0, 50)}...`
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
        args.userMessage.length > 50
          ? `${args.userMessage.substring(0, 50)}...`
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
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
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
