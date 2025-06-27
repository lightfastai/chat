"use client";

import { useEffect, useRef, useState } from "react";

interface UseSmoothTextOptions {
	speed?: number; // Characters per second (default: 256)
	enabled?: boolean; // Whether smoothing is enabled (default: true)
}

/**
 * Hook for smooth text rendering similar to Convex Agent SDK
 * Smoothly animates text appearance to avoid jarring updates during streaming
 */
export function useSmoothText(
	targetText: string,
	options: UseSmoothTextOptions = {},
): [string, boolean] {
	const { speed = 256, enabled = true } = options;
	const [visibleText, setVisibleText] = useState("");
	const [isAnimating, setIsAnimating] = useState(false);
	const animationRef = useRef<number | undefined>(undefined);
	const lastUpdateRef = useRef<number>(0);
	const targetIndexRef = useRef<number>(0);

	useEffect(() => {
		// If smoothing is disabled, show text immediately
		if (!enabled) {
			setVisibleText(targetText);
			setIsAnimating(false);
			return;
		}

		// If target text is shorter than current visible text (e.g., new message)
		if (targetText.length < visibleText.length) {
			setVisibleText(targetText);
			targetIndexRef.current = targetText.length;
			setIsAnimating(targetText.length < targetText.length);
			return;
		}

		// If no new characters to show
		if (targetText.length === visibleText.length) {
			setIsAnimating(false);
			return;
		}

		// Start animation if not already running
		if (!animationRef.current) {
			setIsAnimating(true);
			targetIndexRef.current = visibleText.length;
			lastUpdateRef.current = performance.now();

			const animate = (currentTime: number) => {
				const deltaTime = currentTime - lastUpdateRef.current;
				const charactersToAdd = Math.floor((deltaTime / 1000) * speed);

				if (charactersToAdd > 0) {
					const newIndex = Math.min(
						targetIndexRef.current + charactersToAdd,
						targetText.length,
					);

					setVisibleText(targetText.slice(0, newIndex));
					targetIndexRef.current = newIndex;
					lastUpdateRef.current = currentTime;

					// Continue animation if more characters to show
					if (newIndex < targetText.length) {
						animationRef.current = requestAnimationFrame(animate);
					} else {
						// Animation complete
						animationRef.current = undefined;
						setIsAnimating(false);
					}
				} else {
					// Not enough time has passed, continue animation
					animationRef.current = requestAnimationFrame(animate);
				}
			};

			animationRef.current = requestAnimationFrame(animate);
		}

		// Cleanup animation on unmount or when targetText changes
		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
				animationRef.current = undefined;
			}
		};
	}, [targetText, enabled, speed, visibleText.length]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
		};
	}, []);

	return [visibleText, isAnimating];
}

/**
 * Preset configurations for different use cases
 */
export const SMOOTH_TEXT_PRESETS = {
	// Very fast for debugging
	instant: { speed: 10000, enabled: true },
	// Fast for power users
	fast: { speed: 512, enabled: true },
	// Balanced (default Convex Agent SDK setting)
	balanced: { speed: 256, enabled: true },
	// Slower for dramatic effect
	typewriter: { speed: 50, enabled: true },
	// Disabled for accessibility or performance
	disabled: { speed: 256, enabled: false },
} as const;
