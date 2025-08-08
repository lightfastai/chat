/**
 * Database migrations for converting legacy message formats
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { DbMessagePart } from "./types";

/**
 * Migration to convert legacy body/thinkingContent fields to parts array
 * Run with: npx convex run migrations:migrateMessagesToParts
 */
export const migrateMessagesToParts = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;
    
    // Get ALL messages to find ones that need migration
    // We can't filter directly in the query, so we need to paginate through all
    const allMessages = await ctx.db
      .query("messages")
      .paginate({ numItems: batchSize, cursor: args.cursor ?? null });
    
    let migrated = 0;
    let skipped = 0;
    const messagesToMigrate = [];
    
    // First pass: identify messages that need migration
    for (const message of allMessages.page) {
      // Skip if already has parts
      if (message.parts && message.parts.length > 0) {
        skipped++;
        continue;
      }
      
      // Skip if no legacy content to migrate
      if (!message.body && !message.thinkingContent) {
        skipped++;
        continue;
      }
      
      messagesToMigrate.push(message);
    }
    
    // Second pass: migrate the identified messages
    for (const message of messagesToMigrate) {
      
      // Build parts array from legacy fields
      const parts: DbMessagePart[] = [];
      const timestamp = message.timestamp || message._creationTime;
      
      // Handle thinkingContent (reasoning part comes first)
      if (message.thinkingContent) {
        parts.push({
          type: "reasoning",
          text: message.thinkingContent,
          timestamp,
        });
      }
      
      // Handle body field (main message content)
      if (message.body) {
        parts.push({
          type: "text",
          text: message.body,
          timestamp: timestamp + (message.thinkingContent ? 1 : 0),
        });
      }
      
      // Update the message with new parts
      await ctx.db.patch(message._id, {
        parts,
        // Note: We keep legacy fields for now for safety
        // They can be removed in a separate cleanup migration
      });
      
      migrated++;
    }
    
    return {
      migrated,
      skipped,
      continueCursor: allMessages.continueCursor,
      isDone: allMessages.isDone,
    };
  },
});

/**
 * Count messages that need migration
 * Run with: npx convex run migrations:countLegacyMessages
 */
export const countLegacyMessages = internalQuery({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").collect();
    
    let needsMigration = 0;
    let alreadyMigrated = 0;
    let withBody = 0;
    let withThinkingContent = 0;
    let withBoth = 0;
    
    for (const msg of messages) {
      const hasParts = msg.parts && msg.parts.length > 0;
      const hasBody = !!msg.body;
      const hasThinking = !!msg.thinkingContent;
      
      if (hasParts) {
        alreadyMigrated++;
      } else if (hasBody || hasThinking) {
        needsMigration++;
        if (hasBody) withBody++;
        if (hasThinking) withThinkingContent++;
        if (hasBody && hasThinking) withBoth++;
      }
    }
    
    return {
      total: messages.length,
      needsMigration,
      alreadyMigrated,
      withBody,
      withThinkingContent,
      withBoth,
    };
  },
});

/**
 * Clean up legacy fields after migration
 * Run with: npx convex run migrations:cleanupLegacyFields
 */
export const cleanupLegacyFields = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;
    
    // Get messages using pagination
    const allMessages = await ctx.db
      .query("messages")
      .paginate({ numItems: batchSize, cursor: args.cursor ?? null });
    
    let cleaned = 0;
    let skipped = 0;
    
    for (const message of allMessages.page) {
      // Only clean if has parts and has legacy fields
      if (!message.parts || message.parts.length === 0) {
        skipped++;
        continue;
      }
      
      if (!message.body && !message.thinkingContent) {
        skipped++;
        continue;
      }
      
      // Remove legacy fields
      await ctx.db.patch(message._id, {
        body: undefined,
        thinkingContent: undefined,
        // Also clean up other deprecated fields if needed
        streamChunks: undefined,
        isStreaming: undefined,
        streamId: undefined,
        isComplete: undefined,
        streamVersion: undefined,
        isThinking: undefined,
        hasThinkingContent: undefined,
        lastChunkId: undefined,
      });
      
      cleaned++;
    }
    
    return {
      cleaned,
      skipped,
      continueCursor: allMessages.continueCursor,
      isDone: allMessages.isDone,
    };
  },
});