"use client";

import { useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";

type Thread = Doc<"threads">;
type ThreadWithCategory = Thread & { dateCategory: string };

const ITEMS_PER_PAGE = 5; // Load 5 threads at a time after initial 20

// Helper function to determine date category for a thread
function getDateCategory(lastMessageAt: number): string {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
	const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
	const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

	const threadDate = new Date(lastMessageAt);

	if (threadDate >= today) return "Today";
	if (threadDate >= yesterday) return "Yesterday";
	if (threadDate >= weekAgo) return "This Week";
	if (threadDate >= monthAgo) return "This Month";
	return "Older";
}

interface UseIncrementalThreadsProps {
	initialThreads: Thread[]; // First 20 threads from preload
}

interface UseIncrementalThreadsResult {
	threads: ThreadWithCategory[];
	isLoadingMore: boolean;
	hasMoreData: boolean;
	loadMore: () => void;
}

export function useIncrementalThreads({
	initialThreads,
}: UseIncrementalThreadsProps): UseIncrementalThreadsResult {
	// Initialize with preloaded threads
	const [allThreads, setAllThreads] = useState<ThreadWithCategory[]>(() => {
		// Add date categories to initial threads
		return initialThreads.map((thread) => ({
			...thread,
			dateCategory: getDateCategory(thread.lastMessageAt),
		}));
	});

	const [cursor, setCursor] = useState<string | null>(null);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMoreData, setHasMoreData] = useState(true);
	const [shouldLoadMore, setShouldLoadMore] = useState(false);
	const hasInitialized = useRef(false);

	// Load next page when requested
	const nextPageArgs =
		shouldLoadMore && hasMoreData
			? {
					paginationOpts: { numItems: ITEMS_PER_PAGE, cursor },
					skipFirst: 20, // Skip the first 20 that were preloaded
				}
			: "skip";

	const nextPageResult = useQuery(
		api.threads.listPaginatedWithGrouping,
		nextPageArgs,
	);

	// Handle updates to initial threads prop (from preloaded query updates)
	useEffect(() => {
		setAllThreads((prev) => {
			// Map initial threads with categories
			const updatedWithCategories = initialThreads.map((thread) => ({
				...thread,
				dateCategory: getDateCategory(thread.lastMessageAt),
			}));

			// If we haven't loaded additional pages yet, just use the new initial threads
			if (prev.length <= initialThreads.length) {
				return updatedWithCategories;
			}

			// Otherwise, preserve the additional loaded threads
			// This maintains the pagination state while updating the first batch
			const additionalThreads = prev.slice(initialThreads.length);
			return [...updatedWithCategories, ...additionalThreads];
		});
	}, [initialThreads]);

	// Initialize pagination on first load
	useEffect(() => {
		if (!hasInitialized.current && initialThreads.length === 20) {
			// We have 20 items, so there might be more
			hasInitialized.current = true;
			// Don't set a cursor yet - we'll handle it differently
			setHasMoreData(true);
		}
	}, [initialThreads]); // Run when initialThreads changes

	// Handle loading more data
	useEffect(() => {
		if (shouldLoadMore && nextPageResult) {
			// Add the new threads to our list
			setAllThreads((prev) => [...prev, ...nextPageResult.page]);
			setCursor(nextPageResult.continueCursor);
			setHasMoreData(!nextPageResult.isDone);
			setIsLoadingMore(false);
			setShouldLoadMore(false);
		}
	}, [shouldLoadMore, nextPageResult]);

	// Load more function
	const loadMore = useCallback(() => {
		if (isLoadingMore || !hasMoreData) return;

		setIsLoadingMore(true);
		setShouldLoadMore(true);
	}, [isLoadingMore, hasMoreData]);

	return useMemo(
		() => ({
			threads: allThreads,
			isLoadingMore,
			hasMoreData,
			loadMore,
		}),
		[allThreads, isLoadingMore, hasMoreData, loadMore],
	);
}
