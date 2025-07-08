"use client";

import { cn } from "@lightfast/ui/lib/utils";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as React from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import type { StickToBottomOptions } from "use-stick-to-bottom";

interface InstantBottomProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
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
			"useStickToBottomContext must be used within InstantBottom",
		);
	}
	return context;
}

// Custom hook to handle instant bottom positioning
function useInstantBottom(scrollRef: React.RefObject<HTMLElement>) {
	const hasScrolledToBottom = React.useRef(false);

	React.useLayoutEffect(() => {
		if (scrollRef.current && !hasScrolledToBottom.current) {
			// Force scroll to bottom immediately, but only once
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
			hasScrolledToBottom.current = true;
		}
	});
}

export function InstantBottom({
	children,
	className,
	resize = "smooth",
	style,
}: InstantBottomProps) {
	const internalScrollRef = React.useRef<HTMLDivElement>(null);

	// First, position at bottom instantly
	useInstantBottom(internalScrollRef);

	// Then let use-stick-to-bottom take over
	const { scrollRef, contentRef, isAtBottom, scrollToBottom } =
		useStickToBottom({
			initial: false, // We handle initial positioning ourselves
			resize,
			// Smooth spring animation config
			damping: 0.5,
			stiffness: 0.08,
			mass: 1,
		});

	// Combine refs
	React.useImperativeHandle(
		scrollRef,
		() => internalScrollRef.current as HTMLElement,
		[],
	);

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
					ref={internalScrollRef}
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
