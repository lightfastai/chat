import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarTrigger,
} from "@lightfast/ui/components/ui/sidebar";
import { MessageSquarePlus } from "lucide-react";

// Skeleton loader for the sidebar - provides instant visual feedback
export function SidebarSkeleton() {
	return (
		<Sidebar variant="inset" collapsible="icon" className="w-64 max-w-64">
			<SidebarHeader className="p-0">
				<SidebarGroup className="p-2">
					{/* Platform sidebar trigger - no animations, match exact positioning */}
					<SidebarTrigger className="h-8 w-8" />
				</SidebarGroup>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup className="p-2">
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								{/* New Chat button - match exact styling */}
								<SidebarMenuButton
									size="default"
									className="w-full max-w-full min-w-0 overflow-hidden"
								>
									<MessageSquarePlus className="w-4 h-4" />
									<span className="group-data-[collapsible=icon]:hidden text-xs">
										New Chat
									</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{/* Threads list container - match the actual implementation */}
				<div className="w-full min-w-0 group-data-[collapsible=icon]:hidden">
					<ScrollArea className="flex-1">
						{/* Loading skeleton for threads */}
						<SidebarGroup>
							<SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
								<div className="w-12 h-3 bg-muted animate-pulse rounded" />
							</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu className="space-y-0.5">
									{/* Skeleton thread items - match ThreadItem styling */}
									{Array.from({ length: 4 }, (_, i) => i).map((index) => (
										<SidebarMenuItem key={`skeleton-thread-${index}`}>
											<SidebarMenuButton className="w-full max-w-full min-w-0 overflow-hidden h-auto py-2 px-2.5 text-left">
												<div className="w-full max-w-full min-w-0 flex items-start gap-1.5 overflow-hidden">
													<div className="flex-1 min-w-0 space-y-1">
														<div className="w-3/4 h-3.5 bg-muted animate-pulse rounded" />
														<div className="w-full h-3 bg-muted/60 animate-pulse rounded" />
													</div>
												</div>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>

						<SidebarGroup>
							<SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
								<div className="w-16 h-3 bg-muted animate-pulse rounded" />
							</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu className="space-y-0.5">
									{Array.from({ length: 3 }, (_, i) => i).map((index) => (
										<SidebarMenuItem key={`skeleton-older-${index}`}>
											<SidebarMenuButton className="w-full max-w-full min-w-0 overflow-hidden h-auto py-2 px-2.5 text-left">
												<div className="w-full max-w-full min-w-0 flex items-start gap-1.5 overflow-hidden">
													<div className="flex-1 min-w-0 space-y-1">
														<div className="w-2/3 h-3.5 bg-muted animate-pulse rounded" />
														<div className="w-5/6 h-3 bg-muted/60 animate-pulse rounded" />
													</div>
												</div>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</ScrollArea>
				</div>

				{/* Hover expand zone - fills the space between threads and user menu */}
				<div className="flex-1 relative group-data-[collapsible=icon]:block hidden">
					{/* Hover expand skeleton */}
					<div className="w-full h-full bg-transparent" />
				</div>
			</SidebarContent>
		</Sidebar>
	);
}
