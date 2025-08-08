/**
 * Migration runner mutations
 * 
 * This file provides direct mutation functions to run each migration
 * since the migrations component runner syntax may not be accessible via CLI.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { DbMessagePart } from "./types";

/**
 * Run the usage to metadata migration
 * Processes messages in a single batch per invocation
 */
export const runUsageToMetadata = mutation({
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
      // Skip if no usage to migrate
      if (!message.usage) {
        skipped++;
        continue;
      }
      
      // Skip if metadata.usage already exists
      if (message.metadata?.usage) {
        skipped++;
        continue;
      }
      
      // Create or update metadata with usage
      const currentMetadata = message.metadata || {};
      await ctx.db.patch(message._id, {
        metadata: {
          ...currentMetadata,
          usage: message.usage,
        },
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
 * Run the body to parts migration
 * Processes messages in small batches to avoid memory limits
 */
export const runBodyToParts = mutation({
  args: {},
  returns: v.object({
    processed: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    const BATCH_SIZE = 100;
    let processed = 0;
    let skipped = 0;
    let isDone = false;
    let cursor = null;
    
    while (!isDone) {
      const result = await ctx.db
        .query("messages")
        .paginate({ numItems: BATCH_SIZE, cursor });
      
      for (const message of result.page) {
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
        
        // Patch the document with new parts
        await ctx.db.patch(message._id, {
          parts,
        });
        processed++;
      }
      
      isDone = result.isDone;
      cursor = result.continueCursor;
    }
    
    return { processed, skipped };
  },
});

/**
 * Run the messageType to role migration
 * Processes messages in small batches to avoid memory limits
 */
export const runMessageTypeToRole = mutation({
  args: {},
  returns: v.object({
    processed: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    const BATCH_SIZE = 100;
    let processed = 0;
    let skipped = 0;
    let isDone = false;
    let cursor = null;
    
    while (!isDone) {
      const result = await ctx.db
        .query("messages")
        .paginate({ numItems: BATCH_SIZE, cursor });
      
      for (const message of result.page) {
        // Skip if already has role
        if (message.role) {
          skipped++;
          continue;
        }
        
        // Skip if no messageType to migrate
        if (!message.messageType) {
          // Default to "assistant" if neither field exists
          await ctx.db.patch(message._id, {
            role: "assistant",
          });
          processed++;
          continue;
        }
        
        // Migrate messageType to role
        await ctx.db.patch(message._id, {
          role: message.messageType,
        });
        processed++;
      }
      
      isDone = result.isDone;
      cursor = result.continueCursor;
    }
    
    return { processed, skipped };
  },
});

/**
 * Run the modelId to metadata migration
 * Processes messages in small batches to avoid memory limits
 */
export const runModelIdToMetadata = mutation({
  args: {},
  returns: v.object({
    processed: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    const BATCH_SIZE = 100;
    let processed = 0;
    let skipped = 0;
    let isDone = false;
    let cursor = null;
    
    while (!isDone) {
      const result = await ctx.db
        .query("messages")
        .paginate({ numItems: BATCH_SIZE, cursor });
      
      for (const message of result.page) {
        // Skip if no modelId to migrate
        if (!message.modelId) {
          skipped++;
          continue;
        }
        
        // Skip if metadata.model already exists
        if (message.metadata?.model) {
          skipped++;
          continue;
        }
        
        // Create or update metadata with model
        const currentMetadata = message.metadata || {};
        await ctx.db.patch(message._id, {
          metadata: {
            ...currentMetadata,
            model: message.modelId,
          },
        });
        processed++;
      }
      
      isDone = result.isDone;
      cursor = result.continueCursor;
    }
    
    return { processed, skipped };
  },
});