"use client";

import { Button } from "@lightfast/ui/components/ui/button";
import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
} from "@lightfast/ui/components/ui/sidebar";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
	type Preloaded,
	useMutation,
	usePreloadedQuery,
	useQuery,
} from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { ThreadItem } from "./thread-item";

type Thread = Doc<"threads">;

interface SimpleVirtualizedThreadsListProps {
	preloadedThreads: Preloaded<typeof api.threads.list>;
	className?: string;
}

// Separate pinned threads from unpinned threads
function separatePinnedThreads(threads: Thread[]) {
	const pinned: Thread[] = [];
	const unpinned: Thread[] = [];

	for (const thread of threads) {
		if (thread.pinned) {
			pinned.push(thread);
		} else {
			unpinned.push(thread);
		}
	}

	// Sort pinned threads by lastMessageAt (newest first)
	pinned.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

	return { pinned, unpinned };
}

// Group threads by date
function groupThreadsByDate(threads: Thread[]) {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
	const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
	const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

	const groups: Record<string, Thread[]> = {
		Today: [],
		Yesterday: [],
		"This Week": [],
		"This Month": [],
		Older: [],
	};

	for (const thread of threads) {
		const threadDate = new Date(thread.lastMessageAt);

		if (threadDate >= today) {
			groups.Today.push(thread);
		} else if (threadDate >= yesterday) {
			groups.Yesterday.push(thread);
		} else if (threadDate >= weekAgo) {
			groups["This Week"].push(thread);
		} else if (threadDate >= monthAgo) {
			groups["This Month"].push(thread);
		} else {
			groups.Older.push(thread);
		}
	}

	return groups;
}

// Item types for virtualization
type VirtualItem =
	| { type: "group"; categoryName: string; threads: Thread[] }
	| { type: "load-more" };

// Constants for virtualization
const ITEMS_PER_PAGE = 10; // Number of threads to load per page

// Component to render a group of threads
function ThreadGroup({
	categoryName,
	threads,
	onPinToggle,
}: {
	categoryName: string;
	threads: Thread[];
	onPinToggle: (threadId: Id<"threads">) => void;
}) {
	return (
		<SidebarGroup className="w-58">
			<SidebarGroupLabel className="text-xs font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
				{categoryName}
			</SidebarGroupLabel>
			<SidebarGroupContent className="w-full max-w-full overflow-hidden">
				<SidebarMenu className="space-y-0.5">
					{threads.map((thread) => (
						<ThreadItem
							key={thread._id}
							thread={thread}
							onPinToggle={onPinToggle}
						/>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}

export function SimpleVirtualizedThreadsList({
	preloadedThreads,
	className,
}: SimpleVirtualizedThreadsListProps) {
	const togglePinned = useMutation(api.threads.togglePinned);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

	// Pagination state
	const [cursor, setCursor] = useState<string | null>(null);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [additionalThreads, setAdditionalThreads] = useState<Thread[]>([]);

	// Use preloaded data with reactivity - this provides instant loading with real-time updates
	const threads = usePreloadedQuery(preloadedThreads);

	// Query for paginated results (only when we have a cursor and want to load more)
	const paginationArgs =
		isLoadingMore && hasMore && cursor !== null
			? { paginationOpts: { numItems: ITEMS_PER_PAGE, cursor } }
			: "skip";

	const paginatedResult = useQuery(api.threads.listPaginated, paginationArgs);

	// Handle pagination results
	useEffect(() => {
		if (paginatedResult && isLoadingMore) {
			setAdditionalThreads((prev) => [...prev, ...paginatedResult.page]);
			setCursor(paginatedResult.continueCursor);
			setHasMore(!paginatedResult.isDone);
			setIsLoadingMore(false);
		}
	}, [paginatedResult, isLoadingMore]);

	// Initialize pagination state when threads are loaded
	useEffect(() => {
		// If we have exactly 20 threads from the initial load, there might be more
		if (threads.length === 20 && cursor === null && hasMore) {
			// Set initial cursor to prepare for pagination
			// We'll need to set this when the user clicks "Load More"
			setHasMore(true);
		}
	}, [threads.length, cursor, hasMore]);

	// Combine reactive threads with additional loaded threads
	const allThreads = useMemo(() => {
		// First 20 are reactive, additional ones are static
		return [...threads, ...additionalThreads];
	}, [threads, additionalThreads]);

	// Separate and group threads
	const { pinned, unpinned } = useMemo(
		() => separatePinnedThreads(allThreads),
		[allThreads],
	);
	const groupedThreads = useMemo(
		() => groupThreadsByDate(unpinned),
		[unpinned],
	);

	// Create virtual items for rendering
	const virtualItems = useMemo(() => {
		const items: VirtualItem[] = [];
		const categoryOrder = [
			"Today",
			"Yesterday",
			"This Week",
			"This Month",
			"Older",
		];

		// Add pinned threads section
		if (pinned.length > 0) {
			items.push({ type: "group", categoryName: "Pinned", threads: pinned });
		}

		// Add regular threads grouped by date
		for (const category of categoryOrder) {
			const categoryThreads = groupedThreads[category];
			if (categoryThreads && categoryThreads.length > 0) {
				items.push({
					type: "group",
					categoryName: category,
					threads: categoryThreads,
				});
			}
		}

		// Add load more button if there might be more threads
		if (hasMore && threads.length >= 20) {
			items.push({ type: "load-more" });
		}

		return items;
	}, [pinned, groupedThreads, hasMore, threads.length]);

	// Handle load more
	const handleLoadMore = useCallback(() => {
		if (!isLoadingMore && hasMore) {
			setIsLoadingMore(true);
			// For the first pagination, we need to set an initial cursor
			// Since we don't have the actual cursor from the first 20 items,
			// we'll use an empty string which the backend should handle
			if (cursor === null) {
				setCursor("");
			}
		}
	}, [isLoadingMore, hasMore, cursor]);

	// Handle pin toggle with optimistic update
	const handlePinToggle = useCallback(
		async (threadId: Id<"threads">) => {
			try {
				await togglePinned.withOptimisticUpdate((localStore, args) => {
					// Get the current threads list
					const currentThreads = localStore.getQuery(api.threads.list, {});
					if (!currentThreads) return;

					// Find the thread being toggled
					const threadIndex = currentThreads.findIndex(
						(t) => t._id === args.threadId,
					);
					if (threadIndex === -1) return;

					// Create a new array with the updated thread
					const updatedThreads = [...currentThreads];
					const thread = { ...updatedThreads[threadIndex] };
					thread.pinned = !thread.pinned;
					updatedThreads[threadIndex] = thread;

					// Update the query result
					localStore.setQuery(api.threads.list, {}, updatedThreads);
				})({ threadId });
			} catch (error) {
				console.error("Failed to toggle pin:", error);
				toast.error("Failed to update pin status. Please try again.");
			}
		},
		[togglePinned],
	);

	// Find the scroll viewport element when component mounts
	useEffect(() => {
		if (scrollAreaRef.current) {
			// Add a small delay to ensure the DOM is fully rendered
			const timeoutId = setTimeout(() => {
				const viewport = scrollAreaRef.current?.querySelector(
					'[data-slot="scroll-area-viewport"]',
				);
				if (viewport) {
					setScrollElement(viewport as HTMLElement);
				}
			}, 0);
			return () => clearTimeout(timeoutId);
		}
	}, []);

	// Stable size estimator
	const estimateSize = useCallback(
		(index: number) => {
			const item = virtualItems[index];
			if (!item) return 40;
			if (item.type === "load-more") return 60;
			// For groups, estimate based on number of threads
			// Each thread is ~40px, plus header ~32px, plus padding
			return 32 + item.threads.length * 40 + 16;
		},
		[virtualItems],
	);

	// Set up virtualizer
	const virtualizer = useVirtualizer({
		count: virtualItems.length,
		getScrollElement: () => scrollElement,
		estimateSize,
		overscan: 2, // Render 2 extra groups outside viewport
		enabled: scrollElement !== null, // Disable virtualizer until scroll element is ready
	});

	// Show empty state if no threads
	if (threads.length === 0) {
		return (
			<div className={className}>
				<div className="px-3 py-8 text-center text-muted-foreground">
					<p className="text-xs">No conversations yet</p>
					<p className="text-xs mt-1 opacity-75">Start a new chat to begin</p>
				</div>
			</div>
		);
	}

	return (
		<ScrollArea ref={scrollAreaRef} className={className}>
			<div className="w-full max-w-full min-w-0 overflow-hidden">
				{scrollElement ? (
					<div
						style={{
							height: `${virtualizer.getTotalSize()}px`,
							width: "100%",
							position: "relative",
						}}
					>
						{virtualizer.getVirtualItems().map((virtualItem) => {
							const item = virtualItems[virtualItem.index];
							if (!item) return null;

							return (
								<div
									key={virtualItem.key}
									style={{
										position: "absolute",
										top: 0,
										left: 0,
										width: "100%",
										height: `${virtualItem.size}px`,
										transform: `translateY(${virtualItem.start}px)`,
									}}
								>
									{item.type === "group" ? (
										<ThreadGroup
											categoryName={item.categoryName}
											threads={item.threads}
											onPinToggle={handlePinToggle}
										/>
									) : item.type === "load-more" ? (
										<div className="flex justify-center py-4">
											<Button
												onClick={handleLoadMore}
												disabled={isLoadingMore}
												variant="ghost"
												size="sm"
												className="text-xs"
											>
												{isLoadingMore ? "Loading..." : "Load More"}
											</Button>
										</div>
									) : null}
								</div>
							);
						})}
					</div>
				) : (
					// Show threads without virtualization while scroll element is being detected
					// This prevents the "loading" state when threads are actually available
					<div className="w-full">
						{virtualItems.map((item, index) => (
							<div key={index}>
								{item.type === "group" ? (
									<ThreadGroup
										categoryName={item.categoryName}
										threads={item.threads}
										onPinToggle={handlePinToggle}
									/>
								) : item.type === "load-more" ? (
									<div className="flex justify-center py-4">
										<Button
											onClick={handleLoadMore}
											disabled={isLoadingMore}
											variant="ghost"
											size="sm"
											className="text-xs"
										>
											{isLoadingMore ? "Loading..." : "Load More"}
										</Button>
									</div>
								) : null}
							</div>
						))}
					</div>
				)}
			</div>
		</ScrollArea>
	);
}
