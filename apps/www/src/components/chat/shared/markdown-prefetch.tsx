"use client";

import { useEffect } from "react";

// Prefetch the Markdown component when the chat loads
// This ensures it's ready when messages arrive
export function MarkdownPrefetch() {
	useEffect(() => {
		// Prefetch both Markdown and CodeBlock components
		import("@lightfast/ui/components/ui/markdown");
		import("@lightfast/ui/components/ui/code-block");
	}, []);

	return null;
}
