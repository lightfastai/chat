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

// Virtual item types
interface VirtualItem {
	key: string;
	type: "group" | "load-more";
	categoryName?: string;
	threads?: Thread[];
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

	// Create virtual items for rendering
	const virtualItems = useMemo(() => {
		const items: VirtualItem[] = [];

		// Add pinned threads section
		if (pinned.length > 0) {
			items.push({
				key: "pinned-group",
				type: "group",
				categoryName: "Pinned",
				threads: pinned,
			});
		}

		// Add regular threads grouped by date
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
				items.push({
					key: `${category.toLowerCase().replace(/\s+/g, "-")}-group`,
					type: "group",
					categoryName: category,
					threads: categoryThreads,
				});
			}
		}

		// Add load more button if there might be more threads
		if (hasMore && threads.length >= 20) {
			items.push({
				key: "load-more",
				type: "load-more",
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

	// Calculate size for each virtual item
	const estimateSize = useCallback(
		(index: number) => {
			const item = virtualItems[index];
			if (!item) return 100;

			if (item.type === "load-more") {
				return 56; // Load more button height
			}

			// For groups, calculate based on:
			// - SidebarGroup padding: p-2 (8px top + 8px bottom = 16px)
			// - SidebarGroupLabel: h-8 (32px)
			// - SidebarMenu gap: space-y-0.5 (2px between items)
			// - Thread items: ~40px each
			const threads = item.threads || [];
			const groupPadding = 16;
			const labelHeight = 32;
			const threadHeight = 40;
			const threadGaps = threads.length > 0 ? (threads.length - 1) * 2 : 0;

			return (
				groupPadding + labelHeight + threads.length * threadHeight + threadGaps
			);
		},
		[virtualItems],
	);

	// Set up virtualizer
	const virtualizer = useVirtualizer({
		count: virtualItems.length,
		getScrollElement: () => scrollElement,
		estimateSize,
		overscan: 2,
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

	// Render non-virtualized content while scroll element is loading
	if (!scrollElement) {
		return (
			<ScrollArea ref={scrollAreaRef} className={className}>
				<div className="w-full max-w-full min-w-0 overflow-hidden">
					{virtualItems.map((item) => (
						<div key={item.key}>
							{item.type === "group" && item.threads && item.categoryName ? (
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
								{item.type === "group" && item.threads && item.categoryName ? (
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
			</div>
		</ScrollArea>
	);
}
