import { Icons } from "@lightfast/ui/components/ui/icons";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
} from "@lightfast/ui/components/ui/sidebar";
import { preloadQuery } from "convex/nextjs";
import Link from "next/link";
import { Suspense } from "react";
import { api } from "../../../../convex/_generated/api";
import { getAuthToken } from "../../../lib/auth";
import { ServerSidebarImplementation } from "./server-sidebar-implementation";
import { SidebarSkeleton } from "./sidebar-skeleton";

// Server component wrapper for the sidebar that preloads threads for PPR
export async function ServerSidebar() {
	return (
		<Suspense fallback={<SidebarSkeleton />}>
			<SidebarWithPreloadedData />
		</Suspense>
	);
}

// Server component that handles data preloading with PPR optimization
async function SidebarWithPreloadedData() {
	try {
		// Get authentication token for server-side requests
		const token = await getAuthToken();

		// If no authentication token, render empty sidebar with prompt to sign in
		if (!token) {
			return <SidebarUnauthenticated />;
		}

		// Preload threads data for PPR - this will be cached and streamed instantly
		const preloadedThreads = await preloadQuery(
			api.threads.list,
			{},
			{ token },
		);

		// Preload user data for PPR - this will be cached and streamed instantly
		const preloadedUser = await preloadQuery(api.users.current, {}, { token });

		// Pass preloaded data to server component - only threads list will be client-side
		return (
			<ServerSidebarImplementation
				preloadedThreads={preloadedThreads}
				preloadedUser={preloadedUser}
			/>
		);
	} catch (error) {
		// Log error but still render - don't break the UI
		console.warn("Server-side thread preload failed:", error);

		// Fallback to loading state - client component will handle the error
		return <SidebarSkeleton />;
	}
}

// Component for unauthenticated state
function SidebarUnauthenticated() {
	return (
		<Sidebar variant="inset">
			<SidebarHeader className="p-4">
				<div className="flex items-center gap-3">
					<Link href="/" className="flex items-center gap-3">
						<Icons.logo className="w-6 h-6 text-foreground" />
					</Link>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<div className="p-4 text-center text-muted-foreground">
					<p className="text-sm">Please sign in to view your chats</p>
				</div>
			</SidebarContent>

			<SidebarFooter>
				<div className="p-2">
					<Link
						href="/signin"
						className="flex items-center justify-center w-full px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
					>
						Sign In
					</Link>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
