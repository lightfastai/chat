import { openai } from "@ai-sdk/openai"
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
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      author: v.string(),
      body: v.string(),
      timestamp: v.number(),
      messageType: v.union(v.literal("user"), v.literal("ai")),
      isStreaming: v.optional(v.boolean()),
      streamId: v.optional(v.string()),
      chunkIndex: v.optional(v.number()),
      isComplete: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("messages").order("desc").take(50)
  },
})

export const send = mutation({
  args: {
    author: v.string(),
    body: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Insert user message
    await ctx.db.insert("messages", {
      author: args.author,
      body: args.body,
      timestamp: Date.now(),
      messageType: "user",
    })

    // Schedule AI response
    await ctx.scheduler.runAfter(0, internal.messages.generateAIResponse, {
      userMessage: args.body,
      author: args.author,
    })

    return null
  },
})

// Get streaming chunks for a specific message
export const getMessageChunks = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.array(
    v.object({
      _id: v.id("messageChunks"),
      _creationTime: v.number(),
      messageId: v.id("messages"),
      streamId: v.string(),
      chunkIndex: v.number(),
      content: v.string(),
      timestamp: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messageChunks")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .order("asc")
      .collect()
  },
})

// Get all chunks for a stream ID (useful for reconstructing full message)
export const getStreamChunks = query({
  args: {
    streamId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("messageChunks"),
      _creationTime: v.number(),
      messageId: v.id("messages"),
      streamId: v.string(),
      chunkIndex: v.number(),
      content: v.string(),
      timestamp: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messageChunks")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .order("asc")
      .collect()
  },
})

// Internal action to generate AI response with streaming using Vercel AI SDK
export const generateAIResponse = internalAction({
  args: {
    userMessage: v.string(),
    author: v.string(),
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
          streamId,
          author: "AI Assistant",
        },
      )

      // Get recent conversation context
      const recentMessages = await ctx.runQuery(
        internal.messages.getRecentContext,
        {},
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
          content: `${msg.author}: ${msg.body}`,
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

      let chunkIndex = 0
      let fullContent = ""

      console.log("Starting to process stream chunks...")

      // Process each chunk as it arrives from the stream
      for await (const chunk of textStream) {
        console.log(`Received chunk ${chunkIndex}:`, chunk)
        fullContent += chunk

        // Save each chunk to database
        await ctx.runMutation(internal.messages.addStreamChunk, {
          messageId,
          streamId,
          chunkIndex,
          content: chunk,
        })

        chunkIndex++
      }

      console.log(
        `Stream complete. Total chunks: ${chunkIndex}, Full content length: ${fullContent.length}`,
      )

      if (fullContent.trim() === "") {
        throw new Error(
          "OpenAI returned empty response - check API key and quota",
        )
      }

      // Mark message as complete and update final content
      await ctx.runMutation(internal.messages.completeStreamingMessage, {
        messageId,
        finalContent: fullContent,
      })
    } catch (error) {
      console.error("Error generating AI response:", error)

      // If we have a messageId, update it with error, otherwise create new error message
      if (messageId) {
        await ctx.runMutation(internal.messages.completeStreamingMessage, {
          messageId,
          finalContent: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}. Please check your OpenAI API key.`,
        })
      } else {
        const streamId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        await ctx.runMutation(internal.messages.createErrorMessage, {
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
  args: {},
  returns: v.array(
    v.object({
      author: v.string(),
      body: v.string(),
      messageType: v.union(v.literal("user"), v.literal("ai")),
    }),
  ),
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").order("desc").take(10)

    return messages
      .reverse() // Get chronological order
      .filter((msg: Doc<"messages">) => msg.isComplete !== false) // Only include complete messages
      .map((msg: Doc<"messages">) => ({
        author: msg.author,
        body: msg.body,
        messageType: msg.messageType,
      }))
  },
})

// Internal mutation to create initial streaming message
export const createStreamingMessage = internalMutation({
  args: {
    streamId: v.string(),
    author: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      author: args.author,
      body: "", // Will be updated as chunks arrive
      timestamp: Date.now(),
      messageType: "ai",
      isStreaming: true,
      streamId: args.streamId,
      chunkIndex: 0,
      isComplete: false,
    })
  },
})

// Internal mutation to add a streaming chunk
export const addStreamChunk = internalMutation({
  args: {
    messageId: v.id("messages"),
    streamId: v.string(),
    chunkIndex: v.number(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Add chunk to messageChunks table
    await ctx.db.insert("messageChunks", {
      messageId: args.messageId,
      streamId: args.streamId,
      chunkIndex: args.chunkIndex,
      content: args.content,
      timestamp: Date.now(),
    })

    // Update the main message with accumulated content
    const message = await ctx.db.get(args.messageId)
    if (message) {
      await ctx.db.patch(args.messageId, {
        body: message.body + args.content,
        chunkIndex: args.chunkIndex,
      })
    }

    return null
  },
})

// Internal mutation to mark streaming as complete
export const completeStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    finalContent: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      body: args.finalContent,
      isStreaming: false,
      isComplete: true,
    })

    return null
  },
})

// Internal mutation to create error message
export const createErrorMessage = internalMutation({
  args: {
    streamId: v.string(),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      author: "AI Assistant",
      body: args.errorMessage,
      timestamp: Date.now(),
      messageType: "ai",
      isStreaming: false,
      streamId: args.streamId,
      isComplete: true,
    })

    return null
  },
})
