import { useMemo, useRef } from "react";
import type { DbMessagePart } from "../../convex/types";
import {
	type LightfastUIMessage,
	convertUIPartToDbPart,
	getPartKey,
} from "./convertDbMessagesToUIMessages";

interface PartCacheEntry {
	key: string;
	part: DbMessagePart;
	timestamp: number;
}

/**
 * Custom hook for efficient streaming message part conversion with caching
 * Only converts new/changed parts, reusing cached parts for unchanged content
 */
export function useStreamingMessageParts(
	streamingMessage: LightfastUIMessage | undefined,
): DbMessagePart[] | null {
	// Cache for converted parts - persists across renders
	const partsCache = useRef<Map<string, PartCacheEntry>>(new Map());
	const baseTimestamp = useRef<number>(Date.now());

	return useMemo(() => {
		if (!streamingMessage) return null;

		const convertedParts: DbMessagePart[] = [];
		const currentKeys = new Set<string>();

		// Process each part
		streamingMessage.parts.forEach((part, index) => {
			const key = getPartKey(part, index);
			currentKeys.add(key);

			// Check if we have a cached version
			const cached = partsCache.current.get(key);
			if (cached) {
				// Reuse cached part - no new conversion needed
				convertedParts.push(cached.part);
			} else {
				// Convert new part with stable timestamp
				const timestamp = baseTimestamp.current + index;
				const convertedPart = convertUIPartToDbPart(part, timestamp);

				if (convertedPart) {
					// Cache the converted part
					partsCache.current.set(key, {
						key,
						part: convertedPart,
						timestamp,
					});
					convertedParts.push(convertedPart);
				}
			}
		});

		// Clean up cache - remove parts that are no longer present
		const keysToRemove: string[] = [];
		partsCache.current.forEach((_, key) => {
			if (!currentKeys.has(key)) {
				keysToRemove.push(key);
			}
		});
		for (const key of keysToRemove) {
			partsCache.current.delete(key);
		}

		return convertedParts;
	}, [streamingMessage]);
}
