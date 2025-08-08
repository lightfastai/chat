"use client";

import { useAuthActions } from "@/hooks/use-auth";
import { usePlatformShortcuts } from "@/hooks/use-platform-shortcuts";
import { siteConfig } from "@/lib/site-config";
import { Avatar, AvatarFallback } from "@lightfast/ui/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@lightfast/ui/components/ui/dropdown-menu";
import {
	SidebarMenuButton,
	useSidebar,
} from "@lightfast/ui/components/ui/sidebar";
import { useConvexAuth, useQuery } from "convex/react";
import {
	ChevronDown,
	ExternalLink,
	LogOut,
	Settings,
	User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";

export function SidebarUserMenu() {
	const { signOut } = useAuthActions();
	const router = useRouter();
	const { isAuthenticated } = useConvexAuth();
	const currentUser = useQuery(
		api.users.current,
		isAuthenticated ? {} : "skip",
	);
	const { state } = useSidebar();
	const [open, setOpen] = useState(false);
	const { getShortcut } = usePlatformShortcuts();

	// Close dropdown when sidebar state changes
	useEffect(() => {
		if (state === "collapsed") {
			setOpen(false);
		}
	}, [state]);

	const handleSignOut = async () => {
		await signOut();
		router.push("/");
	};

	const displayName = currentUser?.email || "User";
	const displayEmail = currentUser?.email || "No email";
	const settingsShortcut = getShortcut("openSettings");

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<SidebarMenuButton
					size="default"
					className="w-full group-data-[collapsible=icon]:!p-0 !p-0 overflow-visible"
					data-state={open ? "open" : "closed"}
				>
					<div className="h-8 flex items-center w-full overflow-visible">
						<div className="w-8 h-8 flex-shrink-0 overflow-visible">
							<Avatar className="w-8 h-8 !rounded-md">
								<AvatarFallback className="text-xs !rounded-md">
									<User className="w-4 h-4" />
								</AvatarFallback>
							</Avatar>
						</div>
						<div className="flex items-center gap-2 px-2 flex-1 group-data-[collapsible=icon]:hidden">
							<span className="flex-1 truncate text-left text-xs">
								{displayName}
							</span>
							<ChevronDown className="w-3 h-3" />
						</div>
					</div>
				</SidebarMenuButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-56"
				side="right"
				sideOffset={8}
			>
				<DropdownMenuLabel>
					<div className="flex flex-col space-y-1">
						<p className="text-xs font-medium leading-none">{displayName}</p>
						<p className="text-xs leading-none text-muted-foreground opacity-75">
							{displayEmail}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link
						href="/chat/settings"
						className="cursor-pointer flex items-center justify-between"
						prefetch={true}
					>
						<div className="flex items-center">
							<Settings className="mr-2 h-3 w-3" />
							<span className="text-xs">Settings</span>
						</div>
						<span className="text-xs text-muted-foreground">
							{settingsShortcut.display}
						</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link
						href={siteConfig.links.github.href}
						target="_blank"
						rel="noopener noreferrer"
						className="cursor-pointer"
					>
						<ExternalLink className="mr-2 h-3 w-3" />
						<span className="text-xs">GitHub</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
					<LogOut className="mr-2 h-3 w-3" />
					<span className="text-xs">Sign out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
