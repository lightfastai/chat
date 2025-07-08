import { useMemo, useRef } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import type { DbMessagePart } from "../../convex/types";
import {
	type LightfastUIMessage,
	convertUIPartToDbPart,
	getPartKey,
} from "./convertDbMessagesToUIMessages";
import { useCacheMap } from "./use-cache-map";

interface PartCacheEntry {
	key: string;
	part: DbMessagePart;
	timestamp: number;
}

/**
 * Custom hook for efficient streaming message part conversion with caching
 * Only converts new/changed parts, reusing cached parts for unchanged content
 * Also finds the streaming message from the UI messages
 */
export function useStreamingMessageParts(
	dbMessages: Doc<"messages">[] | null | undefined,
	uiMessages: LightfastUIMessage[],
): {
	streamingMessage: LightfastUIMessage | undefined;
	streamingMessageParts: DbMessagePart[] | null;
} {
	// Cache for converted parts - persists across renders
	const partsCache = useCacheMap<string, PartCacheEntry>();
	const baseTimestamp = useRef<number>(Date.now());

	// Find the streaming message from uiMessages
	const streamingMessage = useMemo(() => {
		if (!dbMessages || dbMessages.length === 0 || uiMessages.length === 0) {
			return undefined;
		}

		// The last message in uiMessages should be the streaming one
		const lastVercelMessage = uiMessages[
			uiMessages.length - 1
		] as LightfastUIMessage;
		// Check if there's a matching database message that's streaming
		const matchingDbMessage = dbMessages.find(
			(msg) =>
				msg._id === lastVercelMessage.metadata?.dbId &&
				msg.status === "streaming",
		);
		if (matchingDbMessage) {
			return lastVercelMessage;
		}
		return undefined;
	}, [dbMessages, uiMessages]);

	const streamingMessageParts = useMemo(() => {
		if (!streamingMessage) return null;

		const convertedParts: DbMessagePart[] = [];
		const currentKeys = new Set<string>();

		// Process each part
		streamingMessage.parts.forEach((part, index) => {
			const key = getPartKey(part, index);
			currentKeys.add(key);

			// Check if we have a cached version
			const cached = partsCache.get(key);
			if (cached) {
				// Reuse cached part - no new conversion needed
				convertedParts.push(cached.part);
			} else {
				// Convert new part with stable timestamp
				const timestamp = baseTimestamp.current + index;
				const convertedPart = convertUIPartToDbPart(part, timestamp);

				if (convertedPart) {
					// Cache the converted part
					partsCache.set(key, {
						key,
						part: convertedPart,
						timestamp,
					});
					convertedParts.push(convertedPart);
				}
			}
		});

		// Clean up cache - remove parts that are no longer present
		partsCache.cleanup(currentKeys);

		return convertedParts;
	}, [streamingMessage, partsCache]);

	return {
		streamingMessage,
		streamingMessageParts,
	};
}
