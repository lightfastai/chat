"use client";

import {
	SidebarMenuAction,
	SidebarMenuItem,
} from "@lightfast/ui/components/ui/sidebar";
import { cn } from "@lightfast/ui/lib/utils";
import { GitBranch, Pin } from "lucide-react";
import { useCallback } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ActiveMenuItem } from "./active-menu-item";

interface ThreadItemProps {
	thread: {
		_id: Id<"threads">;
		clientId?: string;
		title: string;
		isTitleGenerating?: boolean;
		pinned?: boolean;
		branchedFrom?: {
			threadId: Id<"threads">;
			messageId: Id<"messages">;
			timestamp: number;
		};
	};
	onPinToggle: (threadId: Id<"threads">) => void;
}

export function ThreadItem({ thread, onPinToggle }: ThreadItemProps) {
	const handlePinClick = useCallback(
		async (e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			await onPinToggle(thread._id);
		},
		[onPinToggle, thread._id],
	);

	return (
		<SidebarMenuItem className="w-full max-w-full min-w-0 overflow-hidden">
			<ActiveMenuItem
				threadId={thread._id}
				href={`/chat/${thread.clientId || thread._id}`}
			>
				{thread.branchedFrom && (
					<GitBranch className="h-3 w-3 flex-shrink-0 text-muted-foreground mr-1.5" />
				)}
				{!thread.title && thread.isTitleGenerating ? (
					<div className="relative h-4 w-full flex-1 overflow-hidden rounded">
						<div className="absolute inset-0 bg-gradient-to-r from-muted/50 via-muted to-muted/50 animate-shimmer" />
						<div className="absolute inset-0 bg-muted/20 backdrop-blur-[2px]" />
					</div>
				) : (
					<span
						className={cn(
							"font-medium truncate text-ellipsis overflow-hidden min-w-0 flex-1 text-xs",
							thread.isTitleGenerating &&
								"animate-pulse blur-[0.5px] opacity-70",
						)}
					>
						{thread.title ||
							(thread.isTitleGenerating ? "Generating title..." : "")}
					</span>
				)}
			</ActiveMenuItem>
			<SidebarMenuAction
				showOnHover
				onClick={handlePinClick}
				className={cn(
					thread.pinned && "text-primary",
					// Prevent focus ring overflow
					"focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-ring",
				)}
			>
				<Pin className={cn("h-3 w-3", thread.pinned && "fill-current")} />
			</SidebarMenuAction>
		</SidebarMenuItem>
	);
}
