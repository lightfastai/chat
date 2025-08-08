/**
 * Database migrations for converting legacy message formats
 * Using the official @convex-dev/migrations component
 */

import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { DbMessagePart } from "./types";

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
 * Migration to clean up legacy fields after successful migration
 * Only run this after verifying bodyToParts has completed successfully
 */
export const cleanupLegacyFields = migrations.define({
  table: "messages",
  migrateOne: async (ctx, message) => {
    // Only clean if has parts (successfully migrated)
    if (!message.parts || message.parts.length === 0) {
      return; // Skip messages without parts
    }
    
    // Check if has any legacy fields to clean
    const hasLegacyFields = !!(
      message.body ||
      message.thinkingContent ||
      message.streamChunks ||
      message.isStreaming ||
      message.streamId ||
      message.isComplete ||
      message.streamVersion ||
      message.isThinking ||
      message.hasThinkingContent ||
      message.lastChunkId
    );
    
    if (!hasLegacyFields) {
      return; // Nothing to clean
    }
    
    // Remove all legacy fields
    await ctx.db.patch(message._id, {
      body: undefined,
      thinkingContent: undefined,
      streamChunks: undefined,
      isStreaming: undefined,
      streamId: undefined,
      isComplete: undefined,
      streamVersion: undefined,
      isThinking: undefined,
      hasThinkingContent: undefined,
      lastChunkId: undefined,
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
export const runCleanupLegacyFields = migrations.runner(internal.migrations.cleanupLegacyFields);

// Status query to check migration progress
export const { status } = migrations.api();

// Export migration definitions for CLI access
export default migrations;