"use client";

import { useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";

type Thread = Doc<"threads">;
type ThreadWithCategory = Thread & { dateCategory: string };

const ITEMS_PER_PAGE = 50;

interface UseInfiniteThreadsResult {
	threads: ThreadWithCategory[];
	pinnedThreads: Thread[];
	isLoading: boolean;
	isLoadingMore: boolean;
	hasMoreData: boolean;
	loadMore: () => void;
	error: string | null;
}

export function useInfiniteThreads(): UseInfiniteThreadsResult {
	const [allThreads, setAllThreads] = useState<ThreadWithCategory[]>([]);
	const [cursor, setCursor] = useState<string | null>(null);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMoreData, setHasMoreData] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [shouldLoadMore, setShouldLoadMore] = useState(false);
	const [hasInitialized, setHasInitialized] = useState(false);

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
		if (!initialResult) return;

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
