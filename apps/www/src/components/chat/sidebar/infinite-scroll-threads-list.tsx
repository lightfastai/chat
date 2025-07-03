"use client";

import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuItem,
} from "@lightfast/ui/components/ui/sidebar";
import { Skeleton } from "@lightfast/ui/components/ui/skeleton";
import {
	type Preloaded,
	useMutation,
	usePaginatedQuery,
	usePreloadedQuery,
} from "convex/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { ThreadItem } from "./thread-item";

type Thread = Doc<"threads">;

interface InfiniteScrollThreadsListProps {
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

// Loading skeleton for threads
function ThreadSkeleton() {
	return (
		<SidebarMenuItem className="w-full max-w-full min-w-0 overflow-hidden">
			<div className="flex items-center gap-2 p-2 opacity-50">
				<Skeleton className="h-4 w-4 rounded" />
				<Skeleton className="h-4 flex-1" />
			</div>
		</SidebarMenuItem>
	);
}

// Loading group with skeleton threads
function LoadingGroup() {
	return (
		<SidebarGroup className="w-58">
			<SidebarGroupContent className="w-full max-w-full overflow-hidden">
				<SidebarMenu className="space-y-0.5">
					<ThreadSkeleton />
					<ThreadSkeleton />
					<ThreadSkeleton />
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}

export function InfiniteScrollThreadsList({
	preloadedThreads,
	className,
}: InfiniteScrollThreadsListProps) {
	const togglePinned = useMutation(api.threads.togglePinned);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const loadMoreRef = useRef<HTMLDivElement>(null);

	// Use preloaded data for immediate threads (includes both pinned and unpinned)
	const initialThreads = usePreloadedQuery(preloadedThreads);

	// Use paginated query ONLY for additional unpinned threads beyond the first 20
	const {
		results: additionalThreads,
		status,
		loadMore,
		isLoading,
	} = usePaginatedQuery(
		api.threads.listForInfiniteScroll,
		{},
		{ initialNumItems: 5 }, // Load 5 at a time
	);

	// Track previous threads to detect new threads at the top
	const prevThreadsRef = useRef<Thread[]>(initialThreads);

	// Scroll to top when a new thread is added at the beginning
	useEffect(() => {
		if (scrollAreaRef.current) {
			const viewport = scrollAreaRef.current.querySelector(
				'[data-slot="scroll-area-viewport"]',
			);
			if (
				viewport &&
				initialThreads.length > 0 &&
				prevThreadsRef.current.length > 0
			) {
				const firstThread = initialThreads[0];
				const wasFirstThreadNew = !prevThreadsRef.current.some(
					(thread) => thread._id === firstThread._id,
				);

				if (wasFirstThreadNew) {
					viewport.scrollTo({ top: 0, behavior: "smooth" });
				}
			}
		}
		prevThreadsRef.current = initialThreads;
	}, [initialThreads]);

	// Combine initial threads with additional paginated threads
	// Only add threads that aren't already in the initial set
	const allThreads = useMemo(() => {
		const initialIds = new Set(initialThreads.map((t) => t._id));
		const uniqueAdditional = additionalThreads.filter(
			(t) => !initialIds.has(t._id),
		);
		return [...initialThreads, ...uniqueAdditional];
	}, [initialThreads, additionalThreads]);

	// Separate pinned and unpinned threads from the combined list
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

	// Auto-load more when scrolled to bottom
	useEffect(() => {
		const observer = new IntersectionObserver(
			async (entries) => {
				const [entry] = entries;
				if (
					entry.isIntersecting &&
					status === "CanLoadMore" &&
					!isLoading
				) {
					await loadMore(5); // Load 5 more items
				}
			},
			{
				threshold: 1.0,
				rootMargin: "50px", // Start loading a bit earlier
			},
		);

		if (loadMoreRef.current) {
			observer.observe(loadMoreRef.current);
		}

		return () => observer.disconnect();
	}, [status, isLoading, loadMore]);

	// Show empty state if no threads
	if (initialThreads.length === 0) {
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
				{/* Pinned threads section */}
				{pinned.length > 0 && (
					<ThreadGroup
						categoryName="Pinned"
						threads={pinned}
						onPinToggle={handlePinToggle}
					/>
				)}

				{/* Regular threads grouped by date */}
				{["Today", "Yesterday", "This Week", "This Month", "Older"].map(
					(category) => {
						const categoryThreads = groupedThreads[category];
						if (categoryThreads && categoryThreads.length > 0) {
							return (
								<ThreadGroup
									key={category}
									categoryName={category}
									threads={categoryThreads}
									onPinToggle={handlePinToggle}
								/>
							);
						}
						return null;
					},
				)}

				{/* Loading skeletons when actively loading */}
				{isLoading && <LoadingGroup />}

				{/* Intersection observer target for auto-loading */}
				{status === "CanLoadMore" && (
					<div
						ref={loadMoreRef}
						className="h-4 w-full flex items-center justify-center"
						style={{ minHeight: "16px" }} // Prevent layout shift
					>
						{/* Invisible trigger for intersection observer */}
					</div>
				)}
			</div>
		</ScrollArea>
	);
}
