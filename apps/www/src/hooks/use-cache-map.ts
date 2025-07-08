import { useRef } from "react";

/**
 * Generic cache hook that provides a Map-based cache with cleanup functionality
 * Persists across renders and provides methods for getting, setting, and cleaning up entries
 */
export function useCacheMap<K, V>() {
	const cache = useRef<Map<K, V>>(new Map());

	const get = (key: K): V | undefined => {
		return cache.current.get(key);
	};

	const set = (key: K, value: V): void => {
		cache.current.set(key, value);
	};

	const has = (key: K): boolean => {
		return cache.current.has(key);
	};

	const delete_ = (key: K): boolean => {
		return cache.current.delete(key);
	};

	const clear = (): void => {
		cache.current.clear();
	};

	const cleanup = (currentKeys: Set<K>): void => {
		const keysToRemove: K[] = [];
		cache.current.forEach((_, key) => {
			if (!currentKeys.has(key)) {
				keysToRemove.push(key);
			}
		});
		for (const key of keysToRemove) {
			cache.current.delete(key);
		}
	};

	const forEach = (
		callbackfn: (value: V, key: K, map: Map<K, V>) => void,
	): void => {
		cache.current.forEach(callbackfn);
	};

	const size = (): number => {
		return cache.current.size;
	};

	// Return the cache itself for cases where direct access is needed
	const getCache = (): Map<K, V> => {
		return cache.current;
	};

	return {
		get,
		set,
		has,
		delete: delete_,
		clear,
		cleanup,
		forEach,
		size,
		getCache,
	};
}
