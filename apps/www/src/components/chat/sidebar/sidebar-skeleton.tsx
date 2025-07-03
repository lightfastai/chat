import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
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
			</SidebarContent>
		</Sidebar>
	);
}
