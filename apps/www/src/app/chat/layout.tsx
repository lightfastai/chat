import { ChatLayout as ChatLayoutImplementation } from "@/components/chat/chat-layout";
import { KeyboardShortcutsProvider } from "@/components/providers/keyboard-shortcuts-provider";
import { TooltipProvider } from "@lightfast/ui/components/ui/tooltip";
import type React from "react";

interface ChatLayoutProps {
	children: React.ReactNode;
}

// Server component layout - provides static shell and enables SSR with PPR
export default function ChatLayout({ children }: ChatLayoutProps) {
	return (
		<TooltipProvider>
			<KeyboardShortcutsProvider>
				<ChatLayoutImplementation>{children}</ChatLayoutImplementation>
			</KeyboardShortcutsProvider>
		</TooltipProvider>
	);
}
