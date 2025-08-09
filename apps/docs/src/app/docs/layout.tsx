import type { ReactNode } from "react";

export default function DocsLayout({ children }: { children: ReactNode }) {
	return (
		<div className="p-8">
			<div className="max-w-4xl mx-auto">
				{children}
			</div>
		</div>
	);
}