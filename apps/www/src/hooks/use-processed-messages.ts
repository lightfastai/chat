import { useMemo, useRef } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import type { DbMessagePart } from "../../convex/types";
import { isReasoningPart, isTextPart } from "../../convex/types";

/**
 * Process message parts: sort by timestamp, then merge consecutive parts of same type
 */
function processMessageParts(parts: DbMessagePart[]): DbMessagePart[] {
	if (!parts || parts.length === 0) return [];

	// Step 1: Sort all parts by timestamp
	const sortedParts = [...parts].sort((a, b) => {
		const aTimestamp = "timestamp" in a ? a.timestamp : 0;
		const bTimestamp = "timestamp" in b ? b.timestamp : 0;
		return aTimestamp - bTimestamp;
	});

	// Step 2: Merge consecutive parts of the same type
	const mergedParts: DbMessagePart[] = [];

	for (const part of sortedParts) {
		const lastPart = mergedParts[mergedParts.length - 1];

		// Check if we can merge with the previous part
		if (lastPart && lastPart.type === part.type) {
			if (isTextPart(part) && isTextPart(lastPart)) {
				// Merge text parts
				mergedParts[mergedParts.length - 1] = {
					...lastPart,
					text: lastPart.text + part.text,
					timestamp: Math.min(lastPart.timestamp, part.timestamp), // Use earliest timestamp
				};
				continue;
			}
			if (isReasoningPart(part) && isReasoningPart(lastPart)) {
				// Merge reasoning parts
				mergedParts[mergedParts.length - 1] = {
					...lastPart,
					text: lastPart.text + part.text,
					timestamp: Math.min(lastPart.timestamp, part.timestamp), // Use earliest timestamp
				};
				continue;
			}
		}

		// If we can't merge, add as new part
		mergedParts.push(part);
	}

	return mergedParts;
}

/**
 * Custom hook for efficiently processing non-streaming messages with caching
 * Only processes messages when they change from streaming to complete
 */
export function useProcessedMessages(
	dbMessages: Doc<"messages">[] | null | undefined,
): Map<string, Doc<"messages">> {
	// Cache for processed messages - persists across renders
	const processedMessagesCache = useRef<Map<string, Doc<"messages">>>(
		new Map(),
	);
	const messageStatusCache = useRef<Map<string, string>>(new Map());

	// Process messages efficiently - only process new or status-changed messages
	return useMemo(() => {
		if (!dbMessages || dbMessages.length === 0) {
			// Clear cache if no messages
			processedMessagesCache.current.clear();
			messageStatusCache.current.clear();
			return processedMessagesCache.current;
		}

		// Track current message IDs for cleanup
		const currentMessageIds = new Set<string>();

		for (const message of dbMessages) {
			currentMessageIds.add(message._id);

			// Skip streaming messages - they'll be handled separately
			if (message.status === "streaming") {
				continue;
			}

			// Check if we've already processed this message with the same status
			const cachedStatus = messageStatusCache.current.get(message._id);
			const cached = processedMessagesCache.current.get(message._id);

			// Only process if new message or status changed from streaming to complete
			if (!cached || cachedStatus !== message.status) {
				// Process and cache the message
				const processed = {
					...message,
					parts: processMessageParts(message.parts || []),
				};
				processedMessagesCache.current.set(message._id, processed);
				messageStatusCache.current.set(
					message._id,
					message.status || "complete",
				);
			}
		}

		// Clean up messages that no longer exist
		const keysToRemove: string[] = [];
		processedMessagesCache.current.forEach((_, key) => {
			if (!currentMessageIds.has(key)) {
				keysToRemove.push(key);
			}
		});
		for (const key of keysToRemove) {
			processedMessagesCache.current.delete(key);
			messageStatusCache.current.delete(key);
		}

		// Return the cache directly - stable reference
		return processedMessagesCache.current;
	}, [dbMessages]);
}
