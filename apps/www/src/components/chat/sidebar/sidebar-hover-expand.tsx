"use client";

import { useSidebar } from "@lightfast/ui/components/ui/sidebar";
import { cn } from "@lightfast/ui/lib/utils";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

export function SidebarHoverExpand() {
	const { state, setOpen } = useSidebar();
	const [isHovered, setIsHovered] = useState(false);

	if (state === "expanded") return null;

	return (
		<button
			type="button"
			className="absolute left-0 right-0 bottom-0 top-0 group/expand cursor-pointer z-10 bg-transparent border-none"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			onClick={() => setOpen(true)}
			aria-label="Expand sidebar"
		>
			{/* Visible expand icon on hover */}
			<div
				className={cn(
					"absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md",
					"flex items-center justify-center",
					"bg-sidebar-accent text-sidebar-accent-foreground",
					"transition-opacity duration-200",
					isHovered ? "opacity-100" : "opacity-0",
				)}
			>
				<ChevronRight className="w-4 h-4" />
			</div>
		</button>
	);
}
