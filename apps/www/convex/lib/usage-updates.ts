/**
 * Usage update utilities using the new metadata schema
 *
 * These functions demonstrate how to update usage information using the new
 * metadata structure while maintaining backward compatibility.
 */

import type { Id } from "../_generated/dataModel.js";
import type { DatabaseReader, DatabaseWriter } from "../_generated/server.js";
import {
	type MessageUsage,
	type ThreadUsage,
	getMessageUsage,
	getThreadUsage,
	isMessageMigrated,
	isThreadMigrated,
	updateMessageUsage,
	updateThreadUsage,
} from "./metadata.js";

/**
 * Update message usage in the metadata structure
 */
export async function updateMessageUsageMetadata(
	db: DatabaseWriter,
	messageId: Id<"messages">,
	newUsage: Partial<MessageUsage>,
): Promise<void> {
	const message = await db.get(messageId);
	if (!message) {
		throw new Error(`Message ${messageId} not found`);
	}

	// Update metadata with new usage
	const updatedMetadata = updateMessageUsage(message.metadata, newUsage);

	await db.patch(messageId, {
		metadata: updatedMetadata,
	});
}

/**
 * Update thread usage in the metadata structure
 */
export async function updateThreadUsageMetadata(
	db: DatabaseWriter,
	threadId: Id<"threads">,
	newUsage: Partial<ThreadUsage>,
): Promise<void> {
	const thread = await db.get(threadId);
	if (!thread) {
		throw new Error(`Thread ${threadId} not found`);
	}

	// Update metadata with new usage
	const updatedMetadata = updateThreadUsage(thread.metadata, newUsage);

	await db.patch(threadId, {
		metadata: updatedMetadata,
	});
}

/**
 * Add message usage to thread aggregated usage (using metadata)
 */
export async function addMessageUsageToThread(
	db: DatabaseWriter,
	threadId: Id<"threads">,
	messageUsage: MessageUsage,
): Promise<void> {
	const thread = await db.get(threadId);
	if (!thread) {
		throw new Error(`Thread ${threadId} not found`);
	}

	// Get current thread usage (from metadata or legacy field)
	const currentUsage = getThreadUsage(thread) || {
		totalInputTokens: 0,
		totalOutputTokens: 0,
		totalTokens: 0,
		totalReasoningTokens: 0,
		totalCachedInputTokens: 0,
		messageCount: 0,
	};

	// Add message usage to totals
	const updatedUsage: ThreadUsage = {
		totalInputTokens:
			currentUsage.totalInputTokens + (messageUsage.inputTokens || 0),
		totalOutputTokens:
			currentUsage.totalOutputTokens + (messageUsage.outputTokens || 0),
		totalTokens: currentUsage.totalTokens + (messageUsage.totalTokens || 0),
		totalReasoningTokens:
			currentUsage.totalReasoningTokens + (messageUsage.reasoningTokens || 0),
		totalCachedInputTokens:
			currentUsage.totalCachedInputTokens +
			(messageUsage.cachedInputTokens || 0),
		messageCount: currentUsage.messageCount + 1,
	};

	// Update thread metadata
	await updateThreadUsageMetadata(db, threadId, updatedUsage);
}

/**
 * Migrate a single message from legacy usage to metadata
 */
export async function migrateSingleMessage(
	db: DatabaseWriter,
	messageId: Id<"messages">,
): Promise<void> {
	const message = await db.get(messageId);
	if (!message) {
		throw new Error(`Message ${messageId} not found`);
	}

	// Skip if already migrated
	if (isMessageMigrated(message)) {
		return;
	}

	// Get usage from legacy field
	const usage = getMessageUsage(message);
	if (!usage) {
		return;
	}

	// Create metadata with usage
	const metadata = updateMessageUsage(message.metadata, usage);

	await db.patch(messageId, {
		metadata,
	});
}

/**
 * Migrate a single thread from legacy usage to metadata
 */
export async function migrateSingleThread(
	db: DatabaseWriter,
	threadId: Id<"threads">,
): Promise<void> {
	const thread = await db.get(threadId);
	if (!thread) {
		throw new Error(`Thread ${threadId} not found`);
	}

	// Skip if already migrated
	if (isThreadMigrated(thread)) {
		return;
	}

	// Get usage from legacy field
	const usage = getThreadUsage(thread);
	if (!usage) {
		return;
	}

	// Create metadata with usage
	const metadata = updateThreadUsage(thread.metadata, usage);

	await db.patch(threadId, {
		metadata,
	});
}

/**
 * Get usage data with backward compatibility
 * This function tries metadata first, then falls back to legacy fields
 */
export async function getMessageUsageCompatible(
	db: DatabaseReader,
	messageId: Id<"messages">,
): Promise<MessageUsage | null> {
	const message = await db.get(messageId);
	if (!message) {
		return null;
	}

	return getMessageUsage(message);
}

/**
 * Get thread usage data with backward compatibility
 */
export async function getThreadUsageCompatible(
	db: DatabaseReader,
	threadId: Id<"threads">,
): Promise<ThreadUsage | null> {
	const thread = await db.get(threadId);
	if (!thread) {
		return null;
	}

	return getThreadUsage(thread);
}
