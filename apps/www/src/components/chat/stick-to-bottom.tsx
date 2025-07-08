"use client";

import { cn } from "@lightfast/ui/lib/utils";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as React from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import type { StickToBottomOptions } from "use-stick-to-bottom";

interface StickToBottomScrollAreaProps
	extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	initial?: StickToBottomOptions["initial"];
	resize?: StickToBottomOptions["resize"];
}

export const StickToBottomContext = React.createContext<{
	isAtBottom: boolean;
	scrollToBottom: () => Promise<boolean> | boolean;
}>({
	isAtBottom: true,
	scrollToBottom: async () => true,
});

export function useStickToBottomContext() {
	const context = React.useContext(StickToBottomContext);
	if (!context) {
		throw new Error(
			"useStickToBottomContext must be used within StickToBottomScrollArea",
		);
	}
	return context;
}

export function StickToBottomScrollArea({
	children,
	className,
	initial = false,
	resize = "smooth",
	style,
}: StickToBottomScrollAreaProps) {
	const { scrollRef, contentRef, isAtBottom, scrollToBottom } =
		useStickToBottom({
			initial,
			resize,
		});

	const contextValue = React.useMemo(
		() => ({ isAtBottom, scrollToBottom }),
		[isAtBottom, scrollToBottom],
	);

	return (
		<StickToBottomContext.Provider value={contextValue}>
			<ScrollAreaPrimitive.Root
				className={cn("relative overflow-hidden", className)}
				style={style}
			>
				<ScrollAreaPrimitive.Viewport
					ref={scrollRef}
					className="h-full w-full rounded-[inherit]"
				>
					<div ref={contentRef}>{children}</div>
				</ScrollAreaPrimitive.Viewport>
				<ScrollAreaPrimitive.ScrollAreaScrollbar
					orientation="vertical"
					className="flex touch-none select-none transition-colors h-full w-2.5 border-l border-l-transparent p-[1px]"
				>
					<ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
				</ScrollAreaPrimitive.ScrollAreaScrollbar>
				<ScrollAreaPrimitive.Corner />
			</ScrollAreaPrimitive.Root>
		</StickToBottomContext.Provider>
	);
}
