"use client";

import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
} from "@lightfast/ui/components/ui/sidebar";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type Preloaded, useMutation, usePreloadedQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { ThreadItem } from "./thread-item";

type Thread = Doc<"threads">;

// Constants for virtualization
const ESTIMATED_ITEM_HEIGHT = 40; // Estimated height of each thread item in pixels

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

// Server-side function to group threads by date - no client needed
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
	| { type: "thread"; thread: Thread; categoryName?: string }
	| { type: "category-header"; categoryName: string };

export function SimpleVirtualizedThreadsList({
	preloadedThreads,
	className,
}: SimpleVirtualizedThreadsListProps) {
	const togglePinned = useMutation(api.threads.togglePinned);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

	// Use preloaded data with reactivity
	const threads = usePreloadedQuery(preloadedThreads);

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
		const { pinned, unpinned } = separatePinnedThreads(threads);
		const groupedThreads = groupThreadsByDate(unpinned);
		const categoryOrder = [
			"Today",
			"Yesterday",
			"This Week",
			"This Month",
			"Older",
		];

		// Add pinned threads section
		if (pinned.length > 0) {
			items.push({ type: "category-header", categoryName: "Pinned" });
			for (const thread of pinned) {
				items.push({
					type: "thread",
					thread,
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

		return items;
	}, [threads]);

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
			return ESTIMATED_ITEM_HEIGHT; // Thread item height
		},
		overscan: 5, // Render 5 extra items outside viewport for smooth scrolling
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
				<div
					style={{
						height: `${virtualizer.getTotalSize()}px`,
						width: "100%",
						position: "relative",
					}}
				>
					{scrollElement &&
						virtualizer.getVirtualItems().map((virtualItem) => {
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
									) : null}
								</div>
							);
						})}
				</div>
			</div>
		</ScrollArea>
	);
}