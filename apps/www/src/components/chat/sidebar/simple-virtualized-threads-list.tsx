"use client";

import { Button } from "@lightfast/ui/components/ui/button";
import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
import {
	SidebarGroupLabel,
	SidebarMenuItem,
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

// Constants for sizing
const THREAD_ITEM_HEIGHT = 40; // Height of a single thread item
const GROUP_HEADER_HEIGHT = 32; // Height of group label
const GROUP_PADDING_TOP = 8; // Top padding of SidebarGroup
const GROUP_PADDING_BOTTOM = 8; // Bottom padding of SidebarGroup
const LOAD_MORE_HEIGHT = 56; // Height of load more button

// Virtual item types
type VirtualItemType = "group-header" | "thread" | "load-more";

interface VirtualItem {
	key: string;
	type: VirtualItemType;
	// For group headers
	groupName?: string;
	// For threads
	thread?: Thread;
	// For sizing
	size: number;
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

	// Use preloaded data with reactivity
	const threads = usePreloadedQuery(preloadedThreads);

	// Query for paginated results
	const paginationArgs =
		isLoadingMore && hasMore && cursor !== null
			? { paginationOpts: { numItems: 10, cursor } }
			: "skip";

	const paginatedResult = useQuery(api.threads.listPaginated, paginationArgs);

	// Track previous threads to detect new threads at the top
	const prevThreadsRef = useRef<Thread[]>(threads);

	// Scroll to top when a new thread is added at the beginning
	useEffect(() => {
		if (
			threads.length > 0 &&
			prevThreadsRef.current.length > 0 &&
			scrollElement
		) {
			const firstThread = threads[0];
			const wasFirstThreadNew = !prevThreadsRef.current.some(
				(thread) => thread._id === firstThread._id,
			);

			if (wasFirstThreadNew) {
				scrollElement.scrollTo({ top: 0, behavior: "smooth" });
			}
		}
		prevThreadsRef.current = threads;
	}, [threads, scrollElement]);

	// Handle pagination results
	useEffect(() => {
		if (paginatedResult && isLoadingMore) {
			setAdditionalThreads((prev) => [...prev, ...paginatedResult.page]);
			setCursor(paginatedResult.continueCursor);
			setHasMore(!paginatedResult.isDone);
			setIsLoadingMore(false);
		}
	}, [paginatedResult, isLoadingMore]);

	// Combine reactive threads with additional loaded threads
	const allThreads = useMemo(() => {
		return [...threads, ...additionalThreads];
	}, [threads, additionalThreads]);

	// Separate pinned and unpinned threads
	const { pinned, unpinned } = useMemo(() => {
		const pinnedThreads: Thread[] = [];
		const unpinnedThreads: Thread[] = [];

		for (const thread of allThreads) {
			if (thread.pinned) {
				pinnedThreads.push(thread);
			} else {
				unpinnedThreads.push(thread);
			}
		}

		// Sort pinned threads by lastMessageAt (newest first)
		pinnedThreads.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

		return { pinned: pinnedThreads, unpinned: unpinnedThreads };
	}, [allThreads]);

	// Group unpinned threads by date
	const groupedThreads = useMemo(
		() => groupThreadsByDate(unpinned),
		[unpinned],
	);

	// Create flat list of virtual items with proper sizing
	const virtualItems = useMemo(() => {
		const items: VirtualItem[] = [];

		// Add pinned section if there are pinned threads
		if (pinned.length > 0) {
			// Add group header
			items.push({
				key: "pinned-header",
				type: "group-header",
				groupName: "Pinned",
				size: GROUP_HEADER_HEIGHT + GROUP_PADDING_TOP,
			});

			// Add each pinned thread
			for (const thread of pinned) {
				items.push({
					key: `thread-${thread._id}`,
					type: "thread",
					thread,
					size: THREAD_ITEM_HEIGHT,
				});
			}

			// Add bottom padding for the group
			if (items.length > 0) {
				items[items.length - 1].size += GROUP_PADDING_BOTTOM;
			}
		}

		// Add date groups
		const categoryOrder = [
			"Today",
			"Yesterday",
			"This Week",
			"This Month",
			"Older",
		];

		for (const category of categoryOrder) {
			const categoryThreads = groupedThreads[category];
			if (categoryThreads && categoryThreads.length > 0) {
				// Add group header
				items.push({
					key: `${category.toLowerCase().replace(/\s+/g, "-")}-header`,
					type: "group-header",
					groupName: category,
					size: GROUP_HEADER_HEIGHT + GROUP_PADDING_TOP,
				});

				// Add each thread in the group
				for (const thread of categoryThreads) {
					items.push({
						key: `thread-${thread._id}`,
						type: "thread",
						thread,
						size: THREAD_ITEM_HEIGHT,
					});
				}

				// Add bottom padding for the group
				if (items.length > 0) {
					items[items.length - 1].size += GROUP_PADDING_BOTTOM;
				}
			}
		}

		// Add load more button if needed
		if (hasMore && threads.length >= 20) {
			items.push({
				key: "load-more",
				type: "load-more",
				size: LOAD_MORE_HEIGHT,
			});
		}

		return items;
	}, [pinned, groupedThreads, hasMore, threads.length]);

	// Handle load more
	const handleLoadMore = useCallback(() => {
		if (!isLoadingMore && hasMore) {
			setIsLoadingMore(true);
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

	// Set up virtualizer with fixed sizes
	const virtualizer = useVirtualizer({
		count: virtualItems.length,
		getScrollElement: () => scrollElement,
		estimateSize: useCallback(
			(index: number) => {
				return virtualItems[index]?.size || THREAD_ITEM_HEIGHT;
			},
			[virtualItems],
		),
		overscan: 5,
		enabled: scrollElement !== null,
		getItemKey: useCallback(
			(index: number) => virtualItems[index]?.key || `item-${index}`,
			[virtualItems],
		),
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

	// Render helper for virtual items
	const renderVirtualItem = (item: VirtualItem) => {
		switch (item.type) {
			case "group-header":
				return (
					<div
						className="sticky top-0 z-10 bg-sidebar"
						style={{ paddingTop: GROUP_PADDING_TOP }}
					>
						<SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
							{item.groupName}
						</SidebarGroupLabel>
					</div>
				);

			case "thread":
				return item.thread ? (
					<SidebarMenuItem className="w-full max-w-full min-w-0 overflow-hidden">
						<ThreadItem thread={item.thread} onPinToggle={handlePinToggle} />
					</SidebarMenuItem>
				) : null;

			case "load-more":
				return (
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
				);

			default:
				return null;
		}
	};

	// Render non-virtualized content while scroll element is loading
	if (!scrollElement) {
		return (
			<ScrollArea ref={scrollAreaRef} className={className}>
				<div className="w-full max-w-full min-w-0 overflow-hidden">
					{virtualItems.map((item) => (
						<div key={item.key}>{renderVirtualItem(item)}</div>
					))}
				</div>
			</ScrollArea>
		);
	}

	return (
		<ScrollArea ref={scrollAreaRef} className={className}>
			<div className="w-full max-w-full min-w-0 overflow-hidden">
				<div
					style={{
						height: `${virtualizer.getTotalSize()}px`,
						width: "100%",
						position: "relative",
					}}
				>
					{virtualizer.getVirtualItems().map((virtualRow) => {
						const item = virtualItems[virtualRow.index];
						if (!item) return null;

						return (
							<div
								key={virtualRow.key}
								data-index={virtualRow.index}
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									width: "100%",
									height: `${virtualRow.size}px`,
									transform: `translateY(${virtualRow.start}px)`,
								}}
							>
								{renderVirtualItem(item)}
							</div>
						);
					})}
				</div>
			</div>
		</ScrollArea>
	);
}
