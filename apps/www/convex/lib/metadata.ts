/**
 * Metadata utilities for shared metadata schema
 *
 * This module provides utilities for working with the new metadata structure
 * and migrating from legacy usage fields to the metadata.usage structure.
 */

import type { Doc } from "../_generated/dataModel.js";

// Types for the metadata structure
export interface BaseUsage {
	inputTokens?: number;
	outputTokens?: number;
	totalTokens?: number;
	reasoningTokens?: number;
	cachedInputTokens?: number;
}

export interface MessageUsage extends BaseUsage {
	modelId?: string;
	provider?: string;
	usedUserApiKey?: boolean;
	timestamp?: number;
}

export interface ThreadUsage {
	totalInputTokens: number;
	totalOutputTokens: number;
	totalTokens: number;
	totalReasoningTokens: number;
	totalCachedInputTokens: number;
	messageCount: number;
}

export interface BaseMetadata {
	usage?: BaseUsage;
	analytics?: any;
	performance?: any;
	customFields?: Record<string, any>;
	version?: string;
	migrationStatus?: "pending" | "in_progress" | "completed";
}

export interface MessageMetadata extends BaseMetadata {
	usage?: MessageUsage;
	performance?: {
		streamingLatency?: number;
		firstTokenTime?: number;
		completionTime?: number;
	};
}

export interface ThreadMetadata extends BaseMetadata {
	usage?: ThreadUsage;
	analytics?: {
		viewCount?: number;
		shareCount?: number;
		averageResponseTime?: number;
	};
	performance?: {
		averageLatency?: number;
		totalProcessingTime?: number;
	};
}

// Migration helpers

/**
 * Get usage data from the metadata structure
 */
export function getMessageUsage(message: Doc<"messages">): MessageUsage | null {
	if (message.metadata?.usage) {
		return message.metadata.usage;
	}

	return null;
}

/**
 * Get usage data from the metadata structure
 */
export function getThreadUsage(thread: Doc<"threads">): ThreadUsage | null {
	if (thread.metadata?.usage) {
		return thread.metadata.usage;
	}

	return null;
}

/**
 * Create a metadata object with usage data
 */
export function createMessageMetadata(usage: MessageUsage): {
	usage: MessageUsage;
} {
	return {
		usage,
	};
}

/**
 * Create a thread metadata object with usage data
 */
export function createThreadMetadata(usage: ThreadUsage): {
	usage: ThreadUsage;
} {
	return {
		usage,
	};
}

/**
 * Migrate legacy usage data to metadata structure for a message
 */
export function migrateMessageToMetadata(
	message: Doc<"messages">,
): { usage: MessageUsage } | null {
	const usage = getMessageUsage(message);
	if (!usage) return null;

	return createMessageMetadata(usage);
}

/**
 * Migrate legacy usage data to metadata structure for a thread
 */
export function migrateThreadToMetadata(
	thread: Doc<"threads">,
): { usage: ThreadUsage } | null {
	const usage = getThreadUsage(thread);
	if (!usage) return null;

	return createThreadMetadata(usage);
}

/**
 * Check if a message has been migrated to the metadata structure
 */
export function isMessageMigrated(message: Doc<"messages">): boolean {
	return message.metadata?.usage !== undefined;
}

/**
 * Check if a thread has been migrated to the metadata structure
 */
export function isThreadMigrated(thread: Doc<"threads">): boolean {
	return thread.metadata?.usage !== undefined;
}

/**
 * Update usage in metadata structure (backwards compatible)
 */
export function updateMessageUsage(
	currentMetadata: MessageMetadata | undefined,
	newUsage: Partial<MessageUsage>,
): MessageMetadata {
	const existingUsage = currentMetadata?.usage || {};
	const updatedUsage: MessageUsage = {
		...existingUsage,
		...newUsage,
	};

	return {
		...currentMetadata,
		usage: updatedUsage,
		version: "1.0",
		migrationStatus: "completed",
	};
}

/**
 * Update thread usage in metadata structure (backwards compatible)
 */
export function updateThreadUsage(
	currentMetadata: ThreadMetadata | undefined,
	newUsage: Partial<ThreadUsage>,
): ThreadMetadata {
	const existingUsage = currentMetadata?.usage || {
		totalInputTokens: 0,
		totalOutputTokens: 0,
		totalTokens: 0,
		totalReasoningTokens: 0,
		totalCachedInputTokens: 0,
		messageCount: 0,
	};

	const updatedUsage: ThreadUsage = {
		...existingUsage,
		...newUsage,
	};

	return {
		...currentMetadata,
		usage: updatedUsage,
		version: "1.0",
		migrationStatus: "completed",
	};
}
