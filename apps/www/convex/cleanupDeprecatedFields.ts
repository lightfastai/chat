/**
 * Cleanup migration to remove deprecated fields from messages
 * 
 * This migration removes the following deprecated fields:
 * - hasThinkingContent
 * - isComplete
 * - isStreaming
 * - isThinking
 * - lastChunkId
 * - messageType
 * - streamChunks
 * - streamVersion
 * - thinkingCompletedAt
 * - thinkingStartedAt
 * - usage
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Remove deprecated fields from messages
 * Processes in batches to avoid memory limits
 */
export const removeDeprecatedFields = mutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    processed: v.number(),
    skipped: v.number(),
    isDone: v.boolean(),
    continueCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const BATCH_SIZE = args.batchSize ?? 50;
    let processed = 0;
    let skipped = 0;
    
    const result = await ctx.db
      .query("messages")
      .paginate({ numItems: BATCH_SIZE, cursor: args.cursor ?? null });
    
    for (const message of result.page) {
      // Check if message has any of the deprecated fields
      const hasDeprecatedFields = !!(
        message.body ||
        message.streamId ||
        message.hasThinkingContent ||
        message.isComplete !== undefined ||
        message.isStreaming !== undefined ||
        message.isThinking !== undefined ||
        message.lastChunkId ||
        message.messageType ||
        message.streamChunks ||
        message.streamVersion ||
        message.thinkingCompletedAt ||
        message.thinkingStartedAt ||
        message.usage
      );
      
      if (!hasDeprecatedFields) {
        skipped++;
        continue;
      }
      
      // Remove all deprecated fields by setting them to undefined
      await ctx.db.patch(message._id, {
        body: undefined,
        streamId: undefined,
        hasThinkingContent: undefined,
        isComplete: undefined,
        isStreaming: undefined,
        isThinking: undefined,
        lastChunkId: undefined,
        messageType: undefined,
        streamChunks: undefined,
        streamVersion: undefined,
        thinkingCompletedAt: undefined,
        thinkingStartedAt: undefined,
        usage: undefined,
      });
      
      processed++;
    }
    
    return {
      processed,
      skipped,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Check status of deprecated fields
 */
export const checkDeprecatedFields = mutation({
  args: {},
  returns: v.object({
    total: v.number(),
    withDeprecatedFields: v.number(),
    fieldCounts: v.object({
      body: v.number(),
      streamId: v.number(),
      hasThinkingContent: v.number(),
      isComplete: v.number(),
      isStreaming: v.number(),
      isThinking: v.number(),
      lastChunkId: v.number(),
      messageType: v.number(),
      streamChunks: v.number(),
      streamVersion: v.number(),
      thinkingCompletedAt: v.number(),
      thinkingStartedAt: v.number(),
      usage: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").collect();
    
    let withDeprecatedFields = 0;
    const fieldCounts = {
      body: 0,
      streamId: 0,
      hasThinkingContent: 0,
      isComplete: 0,
      isStreaming: 0,
      isThinking: 0,
      lastChunkId: 0,
      messageType: 0,
      streamChunks: 0,
      streamVersion: 0,
      thinkingCompletedAt: 0,
      thinkingStartedAt: 0,
      usage: 0,
    };
    
    for (const message of messages) {
      let hasAnyDeprecated = false;
      
      if (message.body) {
        fieldCounts.body++;
        hasAnyDeprecated = true;
      }
      if (message.streamId) {
        fieldCounts.streamId++;
        hasAnyDeprecated = true;
      }
      if (message.hasThinkingContent) {
        fieldCounts.hasThinkingContent++;
        hasAnyDeprecated = true;
      }
      if (message.isComplete !== undefined) {
        fieldCounts.isComplete++;
        hasAnyDeprecated = true;
      }
      if (message.isStreaming !== undefined) {
        fieldCounts.isStreaming++;
        hasAnyDeprecated = true;
      }
      if (message.isThinking !== undefined) {
        fieldCounts.isThinking++;
        hasAnyDeprecated = true;
      }
      if (message.lastChunkId) {
        fieldCounts.lastChunkId++;
        hasAnyDeprecated = true;
      }
      if (message.messageType) {
        fieldCounts.messageType++;
        hasAnyDeprecated = true;
      }
      if (message.streamChunks) {
        fieldCounts.streamChunks++;
        hasAnyDeprecated = true;
      }
      if (message.streamVersion) {
        fieldCounts.streamVersion++;
        hasAnyDeprecated = true;
      }
      if (message.thinkingCompletedAt) {
        fieldCounts.thinkingCompletedAt++;
        hasAnyDeprecated = true;
      }
      if (message.thinkingStartedAt) {
        fieldCounts.thinkingStartedAt++;
        hasAnyDeprecated = true;
      }
      if (message.usage) {
        fieldCounts.usage++;
        hasAnyDeprecated = true;
      }
      
      if (hasAnyDeprecated) {
        withDeprecatedFields++;
      }
    }
    
    return {
      total: messages.length,
      withDeprecatedFields,
      fieldCounts,
    };
  },
});