/**
 * Database migrations for converting legacy message formats
 * Using the official @convex-dev/migrations component
 */

import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { DbMessagePart } from "./types";
import { query } from "./_generated/server";
import { v } from "convex/values";

// Initialize migrations with type safety
export const migrations = new Migrations<DataModel>(components.migrations);

/**
 * Migration to convert legacy body/thinkingContent fields to parts array
 * 
 * This migration:
 * 1. Converts `thinkingContent` to a reasoning part
 * 2. Converts `body` to a text part
 * 3. Preserves timestamps and order
 * 4. Keeps legacy fields for safety (can be removed later)
 */
export const bodyToParts = migrations.define({
  table: "messages",
  migrateOne: async (ctx, message) => {
    // Skip if already has parts
    if (message.parts && message.parts.length > 0) {
      return; // No changes needed
    }
    
    // Skip if no legacy content to migrate
    if (!message.body && !message.thinkingContent) {
      return; // No changes needed
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
      // Keep legacy fields for now - they can be removed in cleanupLegacyFields migration
    });
  },
});

/**
 * Migration to convert messageType to role field
 * Both fields have the same values: "user" or "assistant"
 */
export const messageTypeToRole = migrations.define({
  table: "messages",
  migrateOne: async (ctx, message) => {
    // Skip if already has role
    if (message.role) {
      return; // Already migrated
    }
    
    // Skip if no messageType to migrate
    if (!message.messageType) {
      // Default to "assistant" if neither field exists
      // This matches the existing fallback logic in the codebase
      await ctx.db.patch(message._id, {
        role: "assistant",
      });
      return;
    }
    
    // Migrate messageType to role
    await ctx.db.patch(message._id, {
      role: message.messageType,
    });
  },
});

/**
 * Migration to move modelId to metadata.model
 * Preserves the model information in the new metadata structure
 */
export const modelIdToMetadata = migrations.define({
  table: "messages",
  migrateOne: async (ctx, message) => {
    // Skip if no modelId to migrate
    if (!message.modelId) {
      return; // Nothing to migrate
    }
    
    // Skip if metadata.model already exists
    if (message.metadata?.model) {
      return; // Already migrated
    }
    
    // Create or update metadata with model
    const currentMetadata = message.metadata || {};
    await ctx.db.patch(message._id, {
      metadata: {
        ...currentMetadata,
        model: message.modelId,
      },
    });
  },
});

/**
 * Migration to move usage field to metadata.usage
 * Preserves token usage information in the new metadata structure
 */
export const usageToMetadata = migrations.define({
  table: "messages",
  migrateOne: async (ctx, message) => {
    // Skip if no usage to migrate
    if (!message.usage) {
      return; // Nothing to migrate
    }
    
    // Skip if metadata.usage already exists
    if (message.metadata?.usage) {
      return; // Already migrated
    }
    
    // Create or update metadata with usage
    const currentMetadata = message.metadata || {};
    await ctx.db.patch(message._id, {
      metadata: {
        ...currentMetadata,
        usage: message.usage,
      },
    });
  },
});

/**
 * Migration to clean up all deprecated fields
 * Removes fields that have been migrated or are no longer needed
 */
export const cleanupDeprecatedFields = migrations.define({
  table: "messages",
  migrateOne: async (ctx, message) => {
    // Check if has any deprecated fields to clean
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
      return; // Nothing to clean
    }
    
    // Remove all deprecated fields
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
  },
});

/**
 * Migration to clean up legacy content fields after successful migration
 * Only run this after verifying bodyToParts has completed successfully
 */
export const cleanupLegacyContentFields = migrations.define({
  table: "messages",
  migrateOne: async (ctx, message) => {
    // Only clean if has parts (successfully migrated)
    if (!message.parts || message.parts.length === 0) {
      return; // Skip messages without parts
    }
    
    // Check if has any legacy content fields to clean
    const hasLegacyContentFields = !!(
      message.body ||
      message.thinkingContent ||
      message.modelId ||
      message.streamId
    );
    
    if (!hasLegacyContentFields) {
      return; // Nothing to clean
    }
    
    // Remove legacy content fields
    await ctx.db.patch(message._id, {
      body: undefined,
      thinkingContent: undefined,
      modelId: undefined,
      streamId: undefined,
    });
  },
});

/**
 * Runner for all migrations or individual ones
 * 
 * Usage:
 * - Run all: npx convex run migrations:run
 * - Run one: npx convex run migrations:runBodyToParts
 */
export const run = migrations.runner();

// Individual runners for specific migrations
export const runBodyToParts = migrations.runner(internal.migrations.bodyToParts);
export const runMessageTypeToRole = migrations.runner(internal.migrations.messageTypeToRole);
export const runModelIdToMetadata = migrations.runner(internal.migrations.modelIdToMetadata);
export const runUsageToMetadata = migrations.runner(internal.migrations.usageToMetadata);
export const runCleanupDeprecatedFields = migrations.runner(internal.migrations.cleanupDeprecatedFields);
export const runCleanupLegacyContentFields = migrations.runner(internal.migrations.cleanupLegacyContentFields);

// Query to check migration status  
// Since the component doesn't expose a direct status method,
// we can check progress by counting messages
export const status = query({
  args: {},
  returns: v.object({
    bodyToParts: v.object({
      needsMigration: v.number(),
      migrated: v.number(),
    }),
    messageTypeToRole: v.object({
      needsMigration: v.number(),
      migrated: v.number(),
    }),
    modelIdToMetadata: v.object({
      needsMigration: v.number(),
      migrated: v.number(),
    }),
    usageToMetadata: v.object({
      needsMigration: v.number(),
      migrated: v.number(),
    }),
    total: v.number(),
  }),
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").collect();
    
    let bodyToPartsNeedsMigration = 0;
    let bodyToPartsMigrated = 0;
    let messageTypeNeedsMigration = 0;
    let messageTypeMigrated = 0;
    let modelIdNeedsMigration = 0;
    let modelIdMigrated = 0;
    let usageNeedsMigration = 0;
    let usageMigrated = 0;
    
    for (const msg of messages) {
      // Check body to parts migration
      if (msg.parts && msg.parts.length > 0) {
        bodyToPartsMigrated++;
      } else if (msg.body || msg.thinkingContent) {
        bodyToPartsNeedsMigration++;
      }
      
      // Check messageType to role migration
      if (msg.role) {
        messageTypeMigrated++;
      } else {
        messageTypeNeedsMigration++;
      }
      
      // Check modelId to metadata migration
      if (msg.modelId && !msg.metadata?.model) {
        modelIdNeedsMigration++;
      } else if (msg.metadata?.model || !msg.modelId) {
        modelIdMigrated++;
      }
      
      // Check usage to metadata migration
      if (msg.usage && !msg.metadata?.usage) {
        usageNeedsMigration++;
      } else if (msg.metadata?.usage || !msg.usage) {
        usageMigrated++;
      }
    }
    
    return {
      bodyToParts: {
        needsMigration: bodyToPartsNeedsMigration,
        migrated: bodyToPartsMigrated,
      },
      messageTypeToRole: {
        needsMigration: messageTypeNeedsMigration,
        migrated: messageTypeMigrated,
      },
      modelIdToMetadata: {
        needsMigration: modelIdNeedsMigration,
        migrated: modelIdMigrated,
      },
      usageToMetadata: {
        needsMigration: usageNeedsMigration,
        migrated: usageMigrated,
      },
      total: messages.length,
    };
  },
});

// Export migration definitions for CLI access
export default migrations;