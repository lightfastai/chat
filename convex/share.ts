import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { nanoid } from "nanoid"
import { mutation, query } from "./_generated/server"

export const shareThread = mutation({
  args: {
    threadId: v.id("threads"),
    settings: v.optional(
      v.object({
        showThinking: v.optional(v.boolean()),
      }),
    ),
  },
  returns: v.object({ shareId: v.string() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("Unauthorized")
    }

    const thread = await ctx.db.get(args.threadId)
    if (!thread) {
      throw new Error("Thread not found")
    }

    if (thread.userId !== userId) {
      throw new Error("Unauthorized: You don't own this thread")
    }

    const now = Date.now()

    // Handle race condition: if thread is already shared, use existing shareId
    if (thread.isPublic && thread.shareId) {
      // Thread is already shared, just update settings if provided
      if (args.settings) {
        await ctx.db.patch(args.threadId, {
          shareSettings: {
            ...thread.shareSettings,
            ...args.settings,
          },
        })
      }
      return { shareId: thread.shareId }
    }

    // Generate a unique share ID for new share (24 chars for security)
    const shareId = thread.shareId || nanoid(24)

    await ctx.db.patch(args.threadId, {
      isPublic: true,
      shareId,
      sharedAt: thread.sharedAt || now,
      shareSettings: args.settings ||
        thread.shareSettings || {
          showThinking: false,
        },
    })

    return { shareId }
  },
})

export const unshareThread = mutation({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("Unauthorized")
    }

    const thread = await ctx.db.get(args.threadId)
    if (!thread) {
      throw new Error("Thread not found")
    }

    if (thread.userId !== userId) {
      throw new Error("Unauthorized: You don't own this thread")
    }

    await ctx.db.patch(args.threadId, {
      isPublic: false,
    })

    return { success: true }
  },
})

export const updateShareSettings = mutation({
  args: {
    threadId: v.id("threads"),
    settings: v.object({
      showThinking: v.optional(v.boolean()),
    }),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("Unauthorized")
    }

    const thread = await ctx.db.get(args.threadId)
    if (!thread) {
      throw new Error("Thread not found")
    }

    if (thread.userId !== userId) {
      throw new Error("Unauthorized: You don't own this thread")
    }

    if (!thread.isPublic) {
      throw new Error("Thread is not shared")
    }

    await ctx.db.patch(args.threadId, {
      shareSettings: {
        ...thread.shareSettings,
        ...args.settings,
      },
    })

    return { success: true }
  },
})

// Mutation to log share access attempts and perform rate limiting
export const logShareAccess = mutation({
  args: {
    shareId: v.string(),
    clientInfo: v.optional(
      v.object({
        ipHash: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      }),
    ),
  },
  returns: v.object({ allowed: v.boolean() }),
  handler: async (ctx, args) => {
    const now = Date.now()
    const hourAgo = now - 60 * 60 * 1000 // 1 hour ago

    // Rate limiting: Check access attempts from this IP in the last hour
    if (args.clientInfo?.ipHash) {
      const recentAttempts = await ctx.db
        .query("shareAccess")
        .withIndex("by_ip_time", (q) =>
          q.eq("ipHash", args.clientInfo!.ipHash).gte("accessedAt", hourAgo),
        )
        .collect()

      // Allow max 100 attempts per hour per IP
      if (recentAttempts.length >= 100) {
        // Log the rate limit violation
        await ctx.db.insert("shareAccess", {
          shareId: args.shareId,
          accessedAt: now,
          ipHash: args.clientInfo.ipHash,
          userAgent: args.clientInfo.userAgent,
          success: false,
        })
        return { allowed: false }
      }
    }

    // Check if thread exists and is public
    const thread = await ctx.db
      .query("threads")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first()

    const success = !!thread?.isPublic

    // Log access attempt
    await ctx.db.insert("shareAccess", {
      shareId: args.shareId,
      accessedAt: now,
      ipHash: args.clientInfo?.ipHash,
      userAgent: args.clientInfo?.userAgent,
      success,
    })

    return { allowed: success }
  },
})

export const getSharedThread = query({
  args: {
    shareId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      thread: v.object({
        _id: v.id("threads"),
        title: v.string(),
        createdAt: v.number(),
        lastMessageAt: v.number(),
        shareSettings: v.optional(
          v.object({
            showThinking: v.optional(v.boolean()),
          }),
        ),
      }),
      messages: v.array(
        v.object({
          _id: v.id("messages"),
          _creationTime: v.number(),
          threadId: v.id("threads"),
          body: v.string(),
          timestamp: v.number(),
          messageType: v.union(v.literal("user"), v.literal("assistant")),
          model: v.optional(
            v.union(
              v.literal("openai"),
              v.literal("anthropic"),
              v.literal("openrouter"),
            ),
          ),
          modelId: v.optional(v.string()),
          isStreaming: v.optional(v.boolean()),
          streamId: v.optional(v.string()),
          isComplete: v.optional(v.boolean()),
          thinkingStartedAt: v.optional(v.number()),
          thinkingCompletedAt: v.optional(v.number()),
          attachments: v.optional(v.array(v.id("files"))),
          thinkingContent: v.optional(v.string()),
          isThinking: v.optional(v.boolean()),
          hasThinkingContent: v.optional(v.boolean()),
          usedUserApiKey: v.optional(v.boolean()),
          usage: v.optional(
            v.object({
              inputTokens: v.optional(v.number()),
              outputTokens: v.optional(v.number()),
              totalTokens: v.optional(v.number()),
              reasoningTokens: v.optional(v.number()),
              cachedInputTokens: v.optional(v.number()),
            }),
          ),
          lastChunkId: v.optional(v.string()),
          streamChunks: v.optional(
            v.array(
              v.object({
                id: v.string(),
                content: v.string(),
                timestamp: v.number(),
                sequence: v.optional(v.number()),
              }),
            ),
          ),
          streamVersion: v.optional(v.number()),
        }),
      ),
      owner: v.union(
        v.null(),
        v.object({
          name: v.union(v.string(), v.null()),
          image: v.union(v.string(), v.null()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    // Find thread by shareId
    const thread = await ctx.db
      .query("threads")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first()

    if (!thread || !thread.isPublic) {
      return null
    }

    // Get all messages for the thread
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
      .collect()

    // Filter out thinking content if not allowed
    const filteredMessages = messages.map((msg) => {
      if (
        !thread.shareSettings?.showThinking &&
        (msg.thinkingContent || msg.isThinking)
      ) {
        return {
          ...msg,
          thinkingContent: undefined,
          isThinking: false,
          hasThinkingContent: false,
        }
      }
      return msg
    })

    // Get thread owner info (just name/avatar for display)
    const owner = await ctx.db.get(thread.userId)

    return {
      thread: {
        _id: thread._id,
        title: thread.title,
        createdAt: thread.createdAt,
        lastMessageAt: thread.lastMessageAt,
        shareSettings: thread.shareSettings,
      },
      messages: filteredMessages,
      owner: owner
        ? {
            name: owner.name ?? null,
            image: owner.image ?? null,
          }
        : null,
    }
  },
})

export const getThreadShareInfo = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.union(
    v.null(),
    v.object({
      isPublic: v.boolean(),
      shareId: v.optional(v.string()),
      sharedAt: v.optional(v.number()),
      shareSettings: v.optional(
        v.object({
          showThinking: v.optional(v.boolean()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return null
    }

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      return null
    }

    return {
      isPublic: thread.isPublic || false,
      shareId: thread.shareId,
      sharedAt: thread.sharedAt,
      shareSettings: thread.shareSettings,
    }
  },
})
