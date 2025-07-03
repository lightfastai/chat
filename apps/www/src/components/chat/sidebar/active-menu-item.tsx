"use client";

import { usePlatformShortcuts } from "@/hooks/use-platform-shortcuts";
import { SidebarMenuButton } from "@lightfast/ui/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";

interface ActiveMenuItemProps {
	threadId: Id<"threads"> | "new";
	href: string;
	children: React.ReactNode;
	size?: "default" | "sm" | "lg";
	prefetch?: boolean;
	tooltip?: string;
}

// Client component that handles active state for individual menu items
export function ActiveMenuItem({
	threadId,
	href,
	children,
	size = "default",
	prefetch = true,
	tooltip,
}: ActiveMenuItemProps) {
	const pathname = usePathname();
	const { getShortcut } = usePlatformShortcuts();

	// Extract the ID from the current pathname
	const currentUrlId = useMemo(() => {
		if (pathname === "/chat") return "new";
		const match = pathname.match(/^\/chat\/(.+)$/);
		return match ? match[1] : "new";
	}, [pathname]);

	// Determine if this thread is active
	// Need to handle both clientId and server ID matching
	const isActive = useMemo(() => {
		if (threadId === "new") {
			return pathname === "/chat";
		}

		// Extract the ID from the href for comparison
		const hrefMatch = href.match(/^\/chat\/(.+)$/);
		const hrefId = hrefMatch ? hrefMatch[1] : null;

		if (!hrefId) return false;

		// If current URL has clientId and href has clientId, compare them
		// If current URL has server ID and href has server ID, compare them
		// This handles the case where user navigates to clientId URL but sidebar shows server ID
		return currentUrlId === hrefId;
	}, [pathname, href, threadId]);

	// Get platform-specific tooltip for new chat
	const displayTooltip = useMemo(() => {
		if (threadId === "new" && !tooltip) {
			const shortcut = getShortcut("newChat");
			return `New Chat (${shortcut.display})`;
		}
		return tooltip;
	}, [threadId, tooltip, getShortcut]);

	return (
		<SidebarMenuButton
			asChild
			size={size}
			isActive={isActive}
			tooltip={displayTooltip}
			className="w-full max-w-full min-w-0 overflow-hidden"
		>
			<Link
				href={href}
				prefetch={prefetch}
				className="w-full max-w-full min-w-0 flex items-center overflow-hidden"
			>
				{children}
			</Link>
		</SidebarMenuButton>
	);
}
