/**
 * Standalone migration status query
 * 
 * This file provides a status query for checking migration progress
 * since the migrations component doesn't expose one directly.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

export const check = query({
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