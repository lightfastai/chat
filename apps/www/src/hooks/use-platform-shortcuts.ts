"use client";

import { useEffect, useState } from "react";

export interface PlatformShortcut {
	modifier: string;
	key: string;
	display: string;
}

// Function to detect platform - safe to run on both server and client
function detectPlatform(): "mac" | "windows" | "linux" {
	// During SSR, default to a generic platform
	if (typeof window === "undefined") {
		return "windows"; // Use windows as default for most common shortcuts
	}

	const userAgent = navigator.userAgent.toLowerCase();
	const platform = navigator.platform.toLowerCase();

	if (platform.includes("mac") || userAgent.includes("mac")) {
		return "mac";
	}
	if (platform.includes("win") || userAgent.includes("win")) {
		return "windows";
	}
	return "linux";
}

export function usePlatformShortcuts() {
	// Initialize with the actual platform, using a function to ensure consistency
	const [platform, setPlatform] = useState<"mac" | "windows" | "linux">(() =>
		detectPlatform(),
	);

	useEffect(() => {
		// Update platform on client side if needed
		const detectedPlatform = detectPlatform();
		if (detectedPlatform !== platform) {
			setPlatform(detectedPlatform);
		}
	}, [platform]);

	const getShortcut = (action: string): PlatformShortcut => {
		switch (action) {
			case "toggleSidebar":
				return {
					mac: { modifier: "⌘", key: "B", display: "⌘B" },
					windows: { modifier: "Ctrl", key: "B", display: "Ctrl+B" },
					linux: { modifier: "Ctrl", key: "B", display: "Ctrl+B" },
				}[platform];
			case "newChat":
				return {
					mac: { modifier: "⌘⇧", key: "O", display: "⌘⇧O" },
					windows: {
						modifier: "Ctrl+Shift",
						key: "O",
						display: "Ctrl+Shift+O",
					},
					linux: { modifier: "Ctrl+Shift", key: "O", display: "Ctrl+Shift+O" },
				}[platform];
			case "openSettings":
				return {
					mac: { modifier: "⌘⇧", key: "S", display: "⌘⇧S" },
					windows: {
						modifier: "Ctrl+Shift",
						key: "S",
						display: "Ctrl+Shift+S",
					},
					linux: { modifier: "Ctrl+Shift", key: "S", display: "Ctrl+Shift+S" },
				}[platform];
			default:
				return { modifier: "", key: "", display: "" };
		}
	};

	return {
		platform,
		getShortcut,
	};
}
