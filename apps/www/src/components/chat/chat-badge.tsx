import { Info } from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@lightfast/ui/components/ui/popover";

export function ChatBadge() {
	return (
		<div className="flex items-center gap-1 mb-2">
			<h1 className="font-mono text-xs text-muted-foreground">Chat</h1>
			<Popover>
				<PopoverTrigger asChild>
					<button type="button" className="hover:opacity-70 transition-opacity">
						<Info className="h-3 w-3 text-muted-foreground" />
					</button>
				</PopoverTrigger>
				<PopoverContent side="right" className="w-80">
					<p className="text-sm">
						Lightfast Chat is currently in beta
					</p>
				</PopoverContent>
			</Popover>
		</div>
	);
}

