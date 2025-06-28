import { getPage, getPages } from "@/src/lib/source"
import defaultMdxComponents from "fumadocs-ui/mdx"
import { DocsBody, DocsPage } from "fumadocs-ui/page"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const resolvedParams = await params
  const page = getPage(resolvedParams.slug)

  if (page == null) {
    notFound()
  }

  const MDX = page.data.body

  return (
    <DocsPage toc={page.data.toc}>
      <DocsBody>
        <h1>{page.data.title}</h1>
        <MDX components={{ ...defaultMdxComponents }} />
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return getPages().map((page) => ({
    slug: page.slugs,
  }))
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const resolvedParams = await params
  const page = getPage(resolvedParams.slug)

  if (page == null) notFound()

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
  }
}
