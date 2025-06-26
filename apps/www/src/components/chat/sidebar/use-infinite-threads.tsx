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

	// Load pinned threads (always loaded, not paginated)
	const pinnedThreads = useQuery(api.threads.listPinned) ?? [];

	// Load initial page of threads with server-side grouping
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

	// Initialize threads on first load
	useEffect(() => {
		if (initialResult && allThreads.length === 0) {
			setAllThreads(initialResult.page);
			setCursor(initialResult.continueCursor);
			setHasMoreData(!initialResult.isDone);
			setError(null);
		}
	}, [initialResult, allThreads.length]);

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
