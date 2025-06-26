"use client";

import { useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";

type Thread = Doc<"threads">;
type ThreadWithCategory = Thread & { dateCategory: string };

const ITEMS_PER_PAGE = 50;

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

interface UseInfiniteThreadsResult {
	threads: ThreadWithCategory[];
	pinnedThreads: Thread[];
	isLoading: boolean;
	isLoadingMore: boolean;
	hasMoreData: boolean;
	loadMore: () => void;
	error: string | null;
}

export function useInfiniteThreads(initialThreads?: Thread[]): UseInfiniteThreadsResult {
	// Initialize with preloaded threads if provided
	const [allThreads, setAllThreads] = useState<ThreadWithCategory[]>(() => {
		if (initialThreads && initialThreads.length > 0) {
			// Add date categories to initial threads
			return initialThreads.map(thread => ({
				...thread,
				dateCategory: getDateCategory(thread.lastMessageAt),
			}));
		}
		return [];
	});
	const [cursor, setCursor] = useState<string | null>(null);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMoreData, setHasMoreData] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [shouldLoadMore, setShouldLoadMore] = useState(false);
	const [hasInitialized, setHasInitialized] = useState(!!initialThreads);

	// Load pinned threads (always loaded, not paginated)
	const pinnedThreads = useQuery(api.threads.listPinned) ?? [];

	// Always load the first page fresh to catch newly active threads
	const initialResult = useQuery(api.threads.listPaginatedWithGrouping, {
		paginationOpts: { numItems: ITEMS_PER_PAGE, cursor: null },
	});

	// Load next page when requested - use skip pattern
	const nextPageArgs =
		shouldLoadMore && cursor
			? { paginationOpts: { numItems: ITEMS_PER_PAGE, cursor } }
			: "skip";
	const nextPageResult = useQuery(
		api.threads.listPaginatedWithGrouping,
		nextPageArgs,
	);

	// Handle initial load and real-time updates to the first page
	useEffect(() => {
		// Skip if we have preloaded threads
		if (!initialResult || initialThreads) return;

		if (!hasInitialized) {
			// First load - set all threads
			setAllThreads(initialResult.page);
			setCursor(initialResult.continueCursor);
			setHasMoreData(!initialResult.isDone);
			setHasInitialized(true);
			setError(null);
		} else {
			// Subsequent updates - merge new threads at the top
			// This ensures newly active threads appear at the top
			const currentThreadIds = new Set(allThreads.map((t) => t._id));
			const newThreads = initialResult.page.filter(
				(t) => !currentThreadIds.has(t._id),
			);

			if (newThreads.length > 0) {
				// Add new threads at the beginning
				setAllThreads((prev) => [...newThreads, ...prev]);
			}

			// Update existing threads that might have changed (e.g., lastMessageAt)
			setAllThreads((prev) => {
				const updatedThreads = [...prev];
				for (let i = 0; i < updatedThreads.length; i++) {
					const freshThread = initialResult.page.find(
						(t) => t._id === updatedThreads[i]._id,
					);
					if (freshThread) {
						updatedThreads[i] = freshThread;
					}
				}
				// Re-sort to ensure correct order
				return updatedThreads.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
			});
		}
	}, [initialResult, hasInitialized]); // Remove allThreads from dependencies to prevent infinite loop

	// Handle loading more data
	useEffect(() => {
		if (shouldLoadMore && nextPageResult) {
			setAllThreads((prev) => [...prev, ...nextPageResult.page]);
			setCursor(nextPageResult.continueCursor);
			setHasMoreData(!nextPageResult.isDone);
			setIsLoadingMore(false);
			setShouldLoadMore(false);
			setError(null);
		}
	}, [shouldLoadMore, nextPageResult]);

	// Load more function
	const loadMore = useCallback(() => {
		if (!cursor || isLoadingMore || !hasMoreData) return;

		setIsLoadingMore(true);
		setShouldLoadMore(true);
		setError(null);
	}, [cursor, isLoadingMore, hasMoreData]);

	// Handle errors
	useEffect(() => {
		if (shouldLoadMore && nextPageResult === undefined && cursor) {
			// If we expected data but got undefined, there might be an error
			setError("Failed to load more conversations");
			setIsLoadingMore(false);
			setShouldLoadMore(false);
		}
	}, [shouldLoadMore, nextPageResult, cursor]);

	const isLoading = initialResult === undefined;

	return useMemo(
		() => ({
			threads: allThreads,
			pinnedThreads,
			isLoading,
			isLoadingMore,
			hasMoreData,
			loadMore,
			error,
		}),
		[
			allThreads,
			pinnedThreads,
			isLoading,
			isLoadingMore,
			hasMoreData,
			loadMore,
			error,
		],
	);
}
