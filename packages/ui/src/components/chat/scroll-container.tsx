/**
 * GOALS:
 * 1. Standalone reusable component - should not have any dependencies with our internal libraries
 * 2. A type field that specifies initial position: "start" or "end"
 *    - "start" means it shows first messages (top of scroll)
 *    - "end" means it shows last messages (bottom of scroll)
 */

"use client";

import * as React from "react";

interface ScrollContainerProps {
	children: React.ReactNode;
	className?: string;
	initialPosition?: "start" | "end";
	autoFollow?: boolean; // Whether to auto-follow when new content is added
}

export function ScrollContainer({
	children,
	className = "",
	initialPosition = "end",
	autoFollow = true,
}: ScrollContainerProps) {
	const scrollRef = React.useRef<HTMLDivElement>(null);
	const contentRef = React.useRef<HTMLDivElement>(null);
	const [isAtBottom, setIsAtBottom] = React.useState(initialPosition === "end");
	const [isNearBottom, setIsNearBottom] = React.useState(
		initialPosition === "end",
	);

	// Track user interaction state
	const [escapedFromBottom, setEscapedFromBottom] = React.useState(false);
	const isUserSelecting = React.useRef(false);
	const lastScrollDirection = React.useRef<"up" | "down" | null>(null);
	const animationFrameId = React.useRef<number | null>(null);
	const hasInitialized = React.useRef(false);

	// Constants
	const NEAR_BOTTOM_THRESHOLD = 70; // pixels from bottom to consider "near"

	// Check if we're at the bottom
	const checkAtBottom = React.useCallback(() => {
		if (!scrollRef.current) return false;
		const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
		return scrollTop + clientHeight >= scrollHeight - 1;
	}, []);

	// Check if we're near the bottom
	const checkNearBottom = React.useCallback(() => {
		if (!scrollRef.current) return false;

		const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
		const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
		return distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
	}, []);

	// Smooth scroll to bottom using spring animation
	const smoothScrollToBottom = React.useCallback(() => {
		if (!scrollRef.current || isUserSelecting.current) return;

		const scrollElement = scrollRef.current;
		let velocity = 0;
		const damping = 0.7;
		const stiffness = 0.05;
		const mass = 1.25;

		const animate = () => {
			const { scrollTop, scrollHeight, clientHeight } = scrollElement;
			const targetScrollTop = scrollHeight - clientHeight;
			const scrollDifference = targetScrollTop - scrollTop;

			// Stop if we're close enough
			if (Math.abs(scrollDifference) < 0.5) {
				scrollElement.scrollTop = targetScrollTop;
				animationFrameId.current = null;
				return;
			}

			// Spring physics
			velocity = (damping * velocity + stiffness * scrollDifference) / mass;
			scrollElement.scrollTop += velocity;

			animationFrameId.current = requestAnimationFrame(animate);
		};

		// Cancel any existing animation
		if (animationFrameId.current) {
			cancelAnimationFrame(animationFrameId.current);
		}

		animationFrameId.current = requestAnimationFrame(animate);
	}, []);

	// Scroll to bottom function
	const scrollToBottom = React.useCallback(
		(smooth = true) => {
			if (!scrollRef.current) return;

			if (smooth && autoFollow) {
				smoothScrollToBottom();
			} else {
				scrollRef.current.scrollTo({
					top: scrollRef.current.scrollHeight,
					behavior: smooth ? "smooth" : "auto",
				});
			}

			// Reset escape state when manually scrolling to bottom
			setEscapedFromBottom(false);
		},
		[smoothScrollToBottom, autoFollow],
	);

	// Scroll to top function
	const scrollToTop = React.useCallback((smooth = true) => {
		if (!scrollRef.current) return;

		scrollRef.current.scrollTo({
			top: 0,
			behavior: smooth ? "smooth" : "auto",
		});
	}, []);

	// Mark as initialized after first render (for "start" position)
	React.useEffect(() => {
		if (initialPosition === "start") {
			hasInitialized.current = true;
		}
	}, [initialPosition]);

	// Handle scroll events
	React.useEffect(() => {
		const scrollElement = scrollRef.current;
		if (!scrollElement) return;

		// Wait for next tick to avoid initial scroll
		const timeoutId = setTimeout(() => {
			let lastScrollTop = scrollElement.scrollTop;

			const handleScroll = () => {
				// Skip if not initialized
				if (!hasInitialized.current) return;

				const currentScrollTop = scrollElement.scrollTop;
				const scrollingUp = currentScrollTop < lastScrollTop;
				const scrollingDown = currentScrollTop > lastScrollTop;

				// Update scroll direction
				if (scrollingUp) {
					lastScrollDirection.current = "up";
				} else if (scrollingDown) {
					lastScrollDirection.current = "down";
				}

				// Check positions
				const isNear = checkNearBottom();
				const isAt = checkAtBottom();

				setIsNearBottom(isNear);
				setIsAtBottom(isAt);

				// Handle escape behavior
				if (scrollingUp && !isAt) {
					setEscapedFromBottom(true);
				} else if (isAt) {
					setEscapedFromBottom(false);
				}

				lastScrollTop = currentScrollTop;
			};

			// Handle wheel events for better escape detection
			const handleWheel = (e: WheelEvent) => {
				if (!hasInitialized.current) return;
				if (e.deltaY < 0 && !checkAtBottom()) {
					setEscapedFromBottom(true);
				}
			};

			scrollElement.addEventListener("scroll", handleScroll, { passive: true });
			scrollElement.addEventListener("wheel", handleWheel, { passive: true });

			// Don't run initial check - let CSS handle initial positioning

			return () => {
				scrollElement.removeEventListener("scroll", handleScroll);
				scrollElement.removeEventListener("wheel", handleWheel);
			};
		}, 0);

		return () => {
			clearTimeout(timeoutId);
		};
	}, [checkNearBottom, checkAtBottom]);

	// Handle mouse selection
	React.useEffect(() => {
		const handleMouseDown = () => {
			isUserSelecting.current = true;
		};

		const handleMouseUp = () => {
			// Delay to allow text selection to complete
			setTimeout(() => {
				isUserSelecting.current = false;
			}, 100);
		};

		document.addEventListener("mousedown", handleMouseDown);
		document.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.removeEventListener("mousedown", handleMouseDown);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, []);

	// Handle content size changes with ResizeObserver
	React.useEffect(() => {
		if (!contentRef.current || !autoFollow) return;

		// Wait a tick to ensure we skip initial render
		const timeoutId = setTimeout(() => {
			if (!contentRef.current) return;

			let previousHeight = contentRef.current.scrollHeight;
			let isFirstResize = true;

			const resizeObserver = new ResizeObserver(() => {
				if (!contentRef.current || !scrollRef.current) return;

				// Skip the first resize event
				if (isFirstResize) {
					isFirstResize = false;
					previousHeight = contentRef.current.scrollHeight;
					return;
				}

				const currentHeight = contentRef.current.scrollHeight;
				const heightChanged = currentHeight !== previousHeight;

				if (heightChanged && hasInitialized.current) {
					// Content size changed after initialization - check if we should auto-follow
					if (isNearBottom && !escapedFromBottom && !isUserSelecting.current) {
						// User is near bottom and hasn't escaped - auto scroll
						smoothScrollToBottom();
					}

					previousHeight = currentHeight;
				}
			});

			resizeObserver.observe(contentRef.current);

			return () => {
				resizeObserver.disconnect();
			};
		}, 100); // Small delay to ensure initial render is complete

		return () => {
			clearTimeout(timeoutId);
		};
	}, [isNearBottom, escapedFromBottom, smoothScrollToBottom, autoFollow]);

	// Cleanup animation on unmount
	React.useEffect(() => {
		return () => {
			if (animationFrameId.current) {
				cancelAnimationFrame(animationFrameId.current);
			}
		};
	}, []);

	// Public API through context
	const contextValue = React.useMemo(
		() => ({
			isAtBottom,
			isNearBottom,
			scrollToBottom,
			scrollToTop,
			scrollRef,
			escapedFromBottom,
		}),
		[isAtBottom, isNearBottom, scrollToBottom, scrollToTop, escapedFromBottom],
	);

	// Handle initial positioning for "end" mode
	React.useLayoutEffect(() => {
		if (initialPosition === "end" && scrollRef.current) {
			const container = scrollRef.current;
			
			// Check if content overflows
			if (container.scrollHeight > container.clientHeight) {
				// Position at bottom
				container.scrollTop = container.scrollHeight;
			}
			// Otherwise leave at top
			
			hasInitialized.current = true;
		}
	}); // No deps - run after every render

	return (
		<ScrollContainerContext.Provider value={contextValue}>
			<div
				ref={scrollRef}
				className={`overflow-auto ${className}`}
				style={{
					position: "relative",
					height: "100%",
					width: "100%",
				}}
			>
				<div ref={contentRef}>{children}</div>
			</div>
		</ScrollContainerContext.Provider>
	);
}

// Context for child components to access scroll state and controls
interface ScrollContainerContextValue {
	isAtBottom: boolean;
	isNearBottom: boolean;
	scrollToBottom: (smooth?: boolean) => void;
	scrollToTop: (smooth?: boolean) => void;
	scrollRef: React.RefObject<HTMLDivElement>;
	escapedFromBottom: boolean;
}

const ScrollContainerContext =
	React.createContext<ScrollContainerContextValue | null>(null);

export function useScrollContainer() {
	const context = React.useContext(ScrollContainerContext);
	if (!context) {
		throw new Error("useScrollContainer must be used within ScrollContainer");
	}
	return context;
}
