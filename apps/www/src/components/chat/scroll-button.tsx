"use client";

import { Button } from "@lightfast/ui/components/ui/button";
import { cn } from "@lightfast/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import { useStickToBottomContext } from "use-stick-to-bottom";

interface ScrollButtonProps {
	className?: string;
}

export function ScrollButton({ className }: ScrollButtonProps) {
	const { isAtBottom, scrollToBottom } = useStickToBottomContext();

	return (
		<Button
			variant="outline"
			size="icon"
			className={cn(
				"rounded-full shadow-lg hover:shadow-xl transition-all duration-200",
				!isAtBottom
					? "translate-y-0 scale-100 opacity-100"
					: "pointer-events-none translate-y-4 scale-95 opacity-0",
				className,
			)}
			onClick={() => scrollToBottom()}
			aria-label="Scroll to bottom"
		>
			<ChevronDown className="h-5 w-5" />
		</Button>
	);
}
