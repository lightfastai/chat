import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { source } from "../lib/source";
import { createDocsOptions } from "./docs-layout-config";
import { SiteHeader } from "./site-header";

export function DocsLayoutWrapper({ children }: { children: ReactNode }) {
	// Create the docs options with the page tree from source
	const docsOptions = createDocsOptions(source.pageTree);

	return (
		<>
			<DocsLayout {...docsOptions}>
				<div className="flex flex-col w-full">
					<SiteHeader />
					<div className="flex flex-row w-full">{children}</div>
				</div>
			</DocsLayout>
		</>
	);
}
