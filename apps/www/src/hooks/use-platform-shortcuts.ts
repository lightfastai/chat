"use client";

import { useEffect, useState } from "react";

export interface PlatformShortcut {
	modifier: string;
	key: string;
	display: string;
}

export function usePlatformShortcuts() {
	const [platform, setPlatform] = useState<"mac" | "windows" | "linux">("mac");

	useEffect(() => {
		// Detect platform
		const userAgent = navigator.userAgent.toLowerCase();
		const platform = navigator.platform.toLowerCase();

		if (platform.includes("mac") || userAgent.includes("mac")) {
			setPlatform("mac");
		} else if (platform.includes("win") || userAgent.includes("win")) {
			setPlatform("windows");
		} else {
			setPlatform("linux");
		}
	}, []);

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
					mac: { modifier: "⌘", key: ",", display: "⌘," },
					windows: { modifier: "Ctrl", key: ",", display: "Ctrl+," },
					linux: { modifier: "Ctrl", key: ",", display: "Ctrl+," },
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
