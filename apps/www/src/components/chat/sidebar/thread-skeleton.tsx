"use client";

import { SidebarMenuItem } from "@lightfast/ui/components/ui/sidebar";

export function ThreadSkeleton() {
	return (
		<SidebarMenuItem className="w-full max-w-full min-w-0 overflow-hidden">
			<div className="flex items-center w-full p-2 rounded-md">
				<div className="flex-1 min-w-0">
					<div
						className="h-3 bg-muted/50 rounded animate-shimmer"
						style={{ width: "75%" }}
					/>
				</div>
				<div className="ml-2 flex-shrink-0">
					<div className="h-3 w-3 bg-muted/30 rounded" />
				</div>
			</div>
		</SidebarMenuItem>
	);
}

export function ThreadListSkeleton({ count = 8 }: { count?: number }) {
	return (
		<div className="space-y-0.5">
			{Array.from({ length: count }, (_, i) => (
				<ThreadSkeleton key={`skeleton-${i}`} />
			))}
		</div>
	);
}
