import { SidebarProvider } from "@lightfast/ui/components/ui/sidebar";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ShareButtonWrapper } from "./share-button-wrapper";
import { ServerSidebar } from "./sidebar/server-sidebar";
import { TokenUsageHeaderWrapper } from "./token-usage-header-wrapper";

interface ChatLayoutProps {
	children: React.ReactNode;
}

// Main layout component - server component with PPR
export async function ChatLayout({ children }: ChatLayoutProps) {
	// Read sidebar state from cookies on server
	const cookieStore = await cookies();
	const sidebarState = cookieStore.get("sidebar_state")?.value;
	const sidebarOpen = sidebarState === "true";

	return (
		<SidebarProvider defaultOpen={sidebarOpen}>
			<div className="flex h-screen w-full">
				<ServerSidebar />
				<div className="flex border-l border-muted/30 flex-col w-full">
					{/* Responsive header - fixed header on small screens, floating on large */}
					<header className="shrink-0 xl:absolute xl:top-0 xl:right-0 xl:z-10 w-full xl:w-auto border-b xl:border-0 border-muted/30">
						<div className="flex items-center justify-end px-2 md:px-4 py-2">
							<div className="flex items-center gap-1 sm:gap-2">
								<Suspense
									fallback={
										<div className="flex items-center gap-2">
											<div className="h-6 w-16 bg-muted animate-pulse rounded" />
											<div className="h-6 w-20 bg-muted animate-pulse rounded" />
										</div>
									}
								>
									<TokenUsageHeaderWrapper />
								</Suspense>
								<Suspense
									fallback={
										<div className="h-8 w-16 bg-muted animate-pulse rounded" />
									}
								>
									<ShareButtonWrapper />
								</Suspense>
							</div>
						</div>
					</header>
					{/* Content area */}
					<div className="flex-1 min-h-0 overflow-hidden">{children}</div>
				</div>
			</div>
		</SidebarProvider>
	);
}
