import "./global.css"
import { fonts } from "@/lib/fonts"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider"
import type { ReactNode } from "react"
import { pageTree } from "../lib/source"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fonts} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <RootProvider>
          <DocsLayout tree={pageTree}>{children}</DocsLayout>
        </RootProvider>
      </body>
    </html>
  )
}

export const metadata = {
  title: "Lightfast Chat Documentation",
  description: "Documentation for Lightfast Chat - AI-powered chat application",
}
