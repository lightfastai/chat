import { openai } from "@ai-sdk/openai"
import { getAuthUserId } from "@convex-dev/auth/server"
import { streamText } from "ai"
import { v } from "convex/values"
import { internal } from "./_generated/api.js"
import type { Doc, Id } from "./_generated/dataModel.js"
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server.js"

export const list = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      threadId: v.id("threads"),
      body: v.string(),
      timestamp: v.number(),
      messageType: v.union(v.literal("user"), v.literal("assistant")),
      isStreaming: v.optional(v.boolean()),
      streamId: v.optional(v.string()),
      isComplete: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    // Verify the user owns this thread
    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      return []
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .take(50)
  },
})

export const send = mutation({
  args: {
    threadId: v.id("threads"),
    body: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated")
    }

    // Verify the user owns this thread
    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or access denied")
    }

    // Insert user message
    await ctx.db.insert("messages", {
      threadId: args.threadId,
      body: args.body,
      timestamp: Date.now(),
      messageType: "user",
    })

    // Update thread's last message timestamp
    await ctx.db.patch(args.threadId, {
      lastMessageAt: Date.now(),
    })

    // Schedule AI response
    await ctx.scheduler.runAfter(0, internal.messages.generateAIResponse, {
      threadId: args.threadId,
      userMessage: args.body,
    })

    return null
  },
})

// Internal action to generate AI response with streaming using Vercel AI SDK
export const generateAIResponse = internalAction({
  args: {
    threadId: v.id("threads"),
    userMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let messageId: Id<"messages"> | null = null
    try {
      // Generate unique stream ID
      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Create initial AI message placeholder
      messageId = await ctx.runMutation(
        internal.messages.createStreamingMessage,
        {
          threadId: args.threadId,
          streamId,
        },
      )

      // Get recent conversation context
      const recentMessages = await ctx.runQuery(
        internal.messages.getRecentContext,
        { threadId: args.threadId },
      )

      // Prepare messages for AI SDK
      const messages = [
        {
          role: "system" as const,
          content:
            "You are a helpful AI assistant in a chat conversation. Be concise and friendly.",
        },
        ...recentMessages.map((msg) => ({
          role:
            msg.messageType === "user"
              ? ("user" as const)
              : ("assistant" as const),
          content: msg.body,
        })),
      ]

      console.log("Attempting to call OpenAI with messages:", messages.length)

      // Stream response using Vercel AI SDK
      const { textStream } = await streamText({
        model: openai("gpt-4o-mini"),
        messages,
        maxTokens: 500,
        temperature: 0.7,
      })

      let fullContent = ""

      console.log("Starting to process stream chunks...")

      // Process each chunk as it arrives from the stream
      for await (const chunk of textStream) {
        console.log("Received chunk:", chunk)
        fullContent += chunk

        // Update the message body progressively
        await ctx.runMutation(internal.messages.updateStreamingMessage, {
          messageId,
          content: fullContent,
        })
      }

      console.log(`Stream complete. Full content length: ${fullContent.length}`)

      if (fullContent.trim() === "") {
        throw new Error(
          "OpenAI returned empty response - check API key and quota",
        )
      }

      // Mark message as complete
      await ctx.runMutation(internal.messages.completeStreamingMessage, {
        messageId,
      })
    } catch (error) {
      console.error("Error generating AI response:", error)

      // If we have a messageId, update it with error, otherwise create new error message
      if (messageId) {
        await ctx.runMutation(internal.messages.updateStreamingMessage, {
          messageId,
          content: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}. Please check your OpenAI API key.`,
        })
        await ctx.runMutation(internal.messages.completeStreamingMessage, {
          messageId,
        })
      } else {
        const streamId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        await ctx.runMutation(internal.messages.createErrorMessage, {
          threadId: args.threadId,
          streamId,
          errorMessage: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}. Please check your OpenAI API key.`,
        })
      }
    }

    return null
  },
})

// Internal function to get recent conversation context
export const getRecentContext = internalQuery({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.array(
    v.object({
      body: v.string(),
      messageType: v.union(v.literal("user"), v.literal("assistant")),
    }),
  ),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .take(10)

    return messages
      .reverse() // Get chronological order
      .filter((msg: Doc<"messages">) => msg.isComplete !== false) // Only include complete messages
      .map((msg: Doc<"messages">) => ({
        body: msg.body,
        messageType: msg.messageType,
      }))
  },
})

// Internal mutation to create initial streaming message
export const createStreamingMessage = internalMutation({
  args: {
    threadId: v.id("threads"),
    streamId: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      threadId: args.threadId,
      body: "", // Will be updated as chunks arrive
      timestamp: Date.now(),
      messageType: "assistant",
      isStreaming: true,
      streamId: args.streamId,
      isComplete: false,
    })
  },
})

// Internal mutation to update streaming message content
export const updateStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      body: args.content,
    })

    return null
  },
})

// Internal mutation to mark streaming as complete
export const completeStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      isStreaming: false,
      isComplete: true,
    })

    return null
  },
})

// Internal mutation to create error message
export const createErrorMessage = internalMutation({
  args: {
    threadId: v.id("threads"),
    streamId: v.string(),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      threadId: args.threadId,
      body: args.errorMessage,
      timestamp: Date.now(),
      messageType: "assistant",
      isStreaming: false,
      streamId: args.streamId,
      isComplete: true,
    })

    return null
  },
})
