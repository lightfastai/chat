"use client";

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
} from "@lightfast/ui/components/ui/sidebar";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { ThreadItem } from "./thread-item";
import { ThreadListSkeleton } from "./thread-skeleton";
import { useInfiniteThreads } from "./use-infinite-threads";
import { useIntersectionObserver } from "./use-intersection-observer";

type Thread = Doc<"threads">;
type ThreadWithCategory = Thread & { dateCategory: string };

// Constants for virtualization
const ESTIMATED_ITEM_HEIGHT = 40; // Estimated height of each thread item in pixels

interface VirtualizedThreadsListProps {
	className?: string;
}

// Client-side function to group threads that already have categories from server
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

export function VirtualizedThreadsList({
	className,
}: VirtualizedThreadsListProps) {
	const togglePinned = useMutation(api.threads.togglePinned);
	const parentRef = useRef<HTMLDivElement>(null);

	// Use infinite scroll hook
	const {
		threads: allThreads,
		pinnedThreads,
		isLoading,
		isLoadingMore,
		hasMoreData,
		loadMore,
	} = useInfiniteThreads();

	// Use intersection observer for loading trigger
	const { ref: loadMoreTriggerRef, isIntersecting } = useIntersectionObserver({
		rootMargin: "100px", // Trigger 100px before the element comes into view
		threshold: 0,
	});

	// Handle pin toggle (simplified without optimistic updates for now)
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

		// Add pinned threads section
		if (pinnedThreads.length > 0) {
			items.push({ type: "category-header", categoryName: "Pinned" });
			for (const thread of pinnedThreads) {
				items.push({
					type: "thread",
					thread: { ...thread, dateCategory: "Pinned" },
					categoryName: "Pinned",
				});
			}
		}

		// Add regular threads grouped by date (server-side grouped)
		if (allThreads.length > 0) {
			const groupedThreads = groupThreadsByCategory(allThreads);
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
					items.push({ type: "category-header", categoryName: category });
					for (const thread of categoryThreads) {
						items.push({ type: "thread", thread, categoryName: category });
					}
				}
			}
		}

		// Add loading indicator if loading more
		if (isLoadingMore) {
			items.push({ type: "loading" });
		}

		return items;
	}, [pinnedThreads, allThreads, isLoadingMore]);

	// Set up virtualizer
	const virtualizer = useVirtualizer({
		count: virtualItems.length,
		getScrollElement: () => parentRef.current,
		estimateSize: (index) => {
			const item = virtualItems[index];
			if (item?.type === "category-header") return 32; // Category header height
			if (item?.type === "loading") return 48; // Loading indicator height
			return ESTIMATED_ITEM_HEIGHT; // Thread item height
		},
		overscan: 5, // Render 5 extra items outside viewport for smooth scrolling
	});

	// Trigger loading when intersection observer detects the load trigger
	useEffect(() => {
		if (isIntersecting && hasMoreData && !isLoadingMore) {
			loadMore();
		}
	}, [isIntersecting, hasMoreData, isLoadingMore, loadMore]);

	// Show loading state
	if (isLoading) {
		return (
			<div
				className={className}
				style={{ height: "calc(100vh - 280px)", overflow: "auto" }}
			>
				<div className="p-3">
					<ThreadListSkeleton count={10} />
				</div>
			</div>
		);
	}

	// Show empty state if no threads
	if (pinnedThreads.length === 0 && allThreads.length === 0) {
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
		<div
			ref={parentRef}
			className={className}
			style={{ height: "calc(100vh - 280px)", overflow: "auto" }}
		>
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
								<div className="px-3 py-2">
									<div className="flex items-center justify-center space-x-2 text-muted-foreground">
										<div className="w-3 h-3 rounded-full bg-current opacity-20 animate-pulse" />
										<div
											className="w-3 h-3 rounded-full bg-current opacity-40 animate-pulse"
											style={{ animationDelay: "0.2s" }}
										/>
										<div
											className="w-3 h-3 rounded-full bg-current opacity-60 animate-pulse"
											style={{ animationDelay: "0.4s" }}
										/>
									</div>
									<div className="text-xs text-center mt-1 text-muted-foreground">
										Loading more...
									</div>
								</div>
							) : null}
						</div>
					);
				})}
			</div>
			{/* Intersection observer trigger for infinite scroll */}
			{hasMoreData && !isLoadingMore && (
				<div
					ref={loadMoreTriggerRef}
					className="h-1 w-full"
					style={{
						position: "absolute",
						bottom: "20px",
						left: 0,
						right: 0,
					}}
				/>
			)}
		</div>
	);
}
