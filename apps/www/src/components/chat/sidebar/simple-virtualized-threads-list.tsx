"use client";

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
type ThreadWithCategory = Thread & { dateCategory: string };

// Constants for virtualization
const ESTIMATED_ITEM_HEIGHT = 40; // Estimated height of each thread item in pixels

interface SimpleVirtualizedThreadsListProps {
	preloadedThreads: Preloaded<typeof api.threads.list>;
	className?: string;
}

// Group threads by date using the date category from server
function groupThreadsByCategory(threads: ThreadWithCategory[]) {
	const groups: Record<string, ThreadWithCategory[]> = {
		Today: [],
		Yesterday: [],
		"This Week": [],
		"This Month": [],
		Older: [],
	};

	for (const thread of threads) {
		const category = thread.dateCategory;
		if (groups[category]) {
			groups[category].push(thread);
		}
	}

	return groups;
}

// Item types for virtualization
type VirtualItem =
	| { type: "thread"; thread: ThreadWithCategory; categoryName?: string }
	| { type: "category-header"; categoryName: string }
	| { type: "loading" };

export function SimpleVirtualizedThreadsList({
	preloadedThreads,
	className,
}: SimpleVirtualizedThreadsListProps) {
	const togglePinned = useMutation(api.threads.togglePinned);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

	// Use preloaded data with reactivity
	const allThreads = usePreloadedQuery(preloadedThreads);

	// Get pinned threads separately (always show all)
	const pinnedThreads = useQuery(api.threads.listPinned) ?? [];

	// State for pagination
	const [cursor, setCursor] = useState<string | undefined>(undefined);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	// Get paginated threads for infinite scroll
	const paginatedResult = useQuery(
		api.threads.listPaginated,
		cursor
			? {
					paginationOpts: {
						cursor,
						numItems: 20,
					},
				}
			: "skip",
	);

	// Helper function to add date category to threads
	const addDateCategory = useCallback((thread: Thread): ThreadWithCategory => {
		const now = new Date();
		const threadDate = new Date(thread._creationTime);
		const diffDays = Math.floor(
			(now.getTime() - threadDate.getTime()) / (1000 * 60 * 60 * 24),
		);

		let dateCategory: string;
		if (diffDays === 0) {
			dateCategory = "Today";
		} else if (diffDays === 1) {
			dateCategory = "Yesterday";
		} else if (diffDays <= 7) {
			dateCategory = "This Week";
		} else if (diffDays <= 30) {
			dateCategory = "This Month";
		} else {
			dateCategory = "Older";
		}

		return { ...thread, dateCategory };
	}, []);

	// Merge all threads (reactive + paginated)
	const threads = useMemo(() => {
		const allThreadsUnpinned = allThreads
			.filter((t) => !t.pinned)
			.map(addDateCategory);
		if (!paginatedResult?.page) return allThreadsUnpinned;

		// Merge and deduplicate by _id, keeping reactive data priority
		const mergedThreads = [...allThreadsUnpinned];

		// Add paginated threads that aren't already in reactive data
		for (const paginatedThread of paginatedResult.page) {
			const existingIndex = mergedThreads.findIndex(
				(t) => t._id === paginatedThread._id,
			);
			if (existingIndex === -1) {
				mergedThreads.push(addDateCategory(paginatedThread));
			}
		}

		return mergedThreads;
	}, [allThreads, paginatedResult?.page, addDateCategory]);

	// Check if we can load more
	const hasMoreData = paginatedResult ? !paginatedResult.isDone : true;

	// Load more function
	const loadMore = useCallback(() => {
		if (!hasMoreData || isLoadingMore) return;

		setIsLoadingMore(true);
		// Set cursor to load next page
		if (paginatedResult?.continueCursor) {
			setCursor(paginatedResult.continueCursor);
		}
		setIsLoadingMore(false);
	}, [hasMoreData, isLoadingMore, paginatedResult?.continueCursor]);

	// Handle pin toggle with optimistic update
	const handlePinToggle = useCallback(
		async (threadId: Id<"threads">) => {
			try {
				await togglePinned({ threadId });
			} catch (error) {
				console.error("Failed to toggle pin:", error);
				toast.error("Failed to update pin status. Please try again.");
			}
		},
		[togglePinned],
	);

	// Create virtual items for rendering
	const virtualItems = useMemo(() => {
		const items: VirtualItem[] = [];
		const groupedThreads = groupThreadsByCategory(threads);
		const categoryOrder = [
			"Today",
			"Yesterday",
			"This Week",
			"This Month",
			"Older",
		];

		// Add pinned threads section
		if (pinnedThreads.length > 0) {
			items.push({ type: "category-header", categoryName: "Pinned" });
			for (const thread of pinnedThreads) {
				// Add date category to pinned threads for consistency
				const threadWithCategory: ThreadWithCategory = {
					...thread,
					dateCategory: "Pinned", // Use "Pinned" as category for pinned threads
				};
				items.push({
					type: "thread",
					thread: threadWithCategory,
					categoryName: "Pinned",
				});
			}
		}

		// Add regular threads grouped by date
		for (const category of categoryOrder) {
			const categoryThreads = groupedThreads[category];
			if (categoryThreads && categoryThreads.length > 0) {
				items.push({ type: "category-header", categoryName: category });
				for (const thread of categoryThreads) {
					items.push({ type: "thread", thread, categoryName: category });
				}
			}
		}

		// Add loading indicator if loading more
		if (isLoadingMore) {
			items.push({ type: "loading" });
		}

		return items;
	}, [threads, pinnedThreads, isLoadingMore]);

	// Find the scroll viewport element when component mounts
	useEffect(() => {
		if (scrollAreaRef.current) {
			const viewport = scrollAreaRef.current.querySelector(
				'[data-slot="scroll-area-viewport"]',
			);
			if (viewport) {
				setScrollElement(viewport as HTMLElement);
			}
		}
	}, []);

	// Set up virtualizer
	const virtualizer = useVirtualizer({
		count: virtualItems.length,
		getScrollElement: () => scrollElement,
		estimateSize: (index) => {
			const item = virtualItems[index];
			if (item?.type === "category-header") return 32; // Category header height
			if (item?.type === "loading") return 60; // Loading indicator height
			return ESTIMATED_ITEM_HEIGHT; // Thread item height
		},
		overscan: 5, // Render 5 extra items outside viewport for smooth scrolling
		enabled: scrollElement !== null, // Disable virtualizer until scroll element is ready
	});

	// Detect when we're near the bottom to load more
	useEffect(() => {
		if (!scrollElement || !hasMoreData || isLoadingMore) return;

		const handleScroll = () => {
			const scrollTop = scrollElement.scrollTop;
			const scrollHeight = scrollElement.scrollHeight;
			const clientHeight = scrollElement.clientHeight;

			// Load more when we're within 200px of the bottom
			if (scrollHeight - scrollTop - clientHeight < 200) {
				loadMore();
			}
		};

		scrollElement.addEventListener("scroll", handleScroll);
		return () => scrollElement.removeEventListener("scroll", handleScroll);
	}, [scrollElement, hasMoreData, isLoadingMore, loadMore]);

	// Show empty state if no threads
	if (allThreads.length === 0) {
		return (
			<div className={className}>
				<div className="px-3 py-8 text-center text-muted-foreground">
					<p className="text-xs">No conversations yet</p>
					<p className="text-xs mt-1 opacity-75">Start a new chat to begin</p>
				</div>
			</div>
		);
	}

	// Component to render a group of threads
	function ThreadGroup({
		categoryName,
		threads,
		onPinToggle,
	}: {
		categoryName: string;
		threads: ThreadWithCategory[];
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

	// Show non-virtualized threads while scroll element initializes
	if (!scrollElement) {
		const groupedThreads = groupThreadsByCategory(threads);
		const categoryOrder = [
			"Today",
			"Yesterday",
			"This Week",
			"This Month",
			"Older",
		];

		return (
			<ScrollArea ref={scrollAreaRef} className={className}>
				<div className="w-full max-w-full min-w-0 overflow-hidden">
					{pinnedThreads.length > 0 && (
						<ThreadGroup
							categoryName="Pinned"
							threads={pinnedThreads.map((thread) => ({
								...thread,
								dateCategory: "Pinned",
							}))}
							onPinToggle={handlePinToggle}
						/>
					)}
					{categoryOrder.map((category) => {
						const categoryThreads = groupedThreads[category];
						if (!categoryThreads || categoryThreads.length === 0) return null;
						return (
							<ThreadGroup
								key={category}
								categoryName={category}
								threads={categoryThreads}
								onPinToggle={handlePinToggle}
							/>
						);
					})}
					{hasMoreData && (
						<div className="p-3">
							<button
								type="button"
								onClick={loadMore}
								disabled={isLoadingMore}
								className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
							>
								{isLoadingMore ? "Loading..." : "Load More"}
							</button>
						</div>
					)}
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
								{item.type === "category-header" ? (
									<SidebarGroup className="w-58">
										<SidebarGroupLabel className="text-xs font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
											{item.categoryName}
										</SidebarGroupLabel>
									</SidebarGroup>
								) : item.type === "thread" ? (
									<SidebarGroup className="w-58">
										<SidebarGroupContent className="w-full max-w-full overflow-hidden">
											<SidebarMenu className="space-y-0.5">
												<ThreadItem
													thread={item.thread}
													onPinToggle={handlePinToggle}
												/>
											</SidebarMenu>
										</SidebarGroupContent>
									</SidebarGroup>
								) : item.type === "loading" ? (
									<div className="px-3 py-4">
										<div className="flex items-center justify-center space-x-2 text-muted-foreground">
											<div className="w-2 h-2 rounded-full bg-current opacity-20 animate-pulse" />
											<div
												className="w-2 h-2 rounded-full bg-current opacity-40 animate-pulse"
												style={{ animationDelay: "0.2s" }}
											/>
											<div
												className="w-2 h-2 rounded-full bg-current opacity-60 animate-pulse"
												style={{ animationDelay: "0.4s" }}
											/>
										</div>
										<div className="text-xs text-center mt-2 text-muted-foreground">
											Loading more...
										</div>
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
