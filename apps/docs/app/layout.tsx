import "./globals.css"
import { fonts } from "@/lib/fonts"
import { RootProvider } from "fumadocs-ui/provider"
import type { ReactNode } from "react"
import { DocsLayoutWrapper } from "../components/docs-layout-wrapper"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fonts} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <RootProvider>
          <DocsLayoutWrapper>{children}</DocsLayoutWrapper>
        </RootProvider>
      </body>
    </html>
  )
}

export const metadata = {
  title: "Lightfast Chat Documentation",
  description: "Documentation for Lightfast Chat - AI-powered chat application",
}
