import { getPage, getPages } from "@/src/lib/source";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export default async function Page({
	params,
}: {
	params: Promise<{ slug?: string[] }>;
}) {
	const resolvedParams = await params;
	const page = getPage(resolvedParams.slug);

	if (page == null) {
		notFound();
	}

	const MDX = page.data.body;

	return (
		<article className="prose prose-neutral dark:prose-invert max-w-none">
			<h1 className="text-4xl font-bold tracking-tight mb-4">{page.data.title}</h1>
			{page.data.description && (
				<p className="text-lg text-muted-foreground mb-8">{page.data.description}</p>
			)}
			<div className="prose-content">
				<MDX components={{ ...defaultMdxComponents }} />
			</div>
		</article>
	);
}

export async function generateStaticParams() {
	return getPages().map((page) => ({
		slug: page.slugs,
	}));
}

export async function generateMetadata({
	params,
}: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
	const resolvedParams = await params;
	const page = getPage(resolvedParams.slug);

	if (page == null) notFound();

	return {
		title: page.data.title,
		description: page.data.description,
		openGraph: {
			title: page.data.title,
			description: page.data.description,
		},
		twitter: {
			card: "summary_large_image",
			title: page.data.title,
			description: page.data.description,
		},
	};
}
