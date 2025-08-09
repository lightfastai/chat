import type { ReactNode } from "react";
import { source } from "../lib/source";
import { CustomSidebar } from "./custom-sidebar";

export function DocsLayoutWrapper({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-h-screen">
			<CustomSidebar tree={source.pageTree} />
			<main className="flex-1">
				{children}
			</main>
		</div>
	);
}
