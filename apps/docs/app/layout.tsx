import "./global.css"
import { RootProvider } from "fumadocs-ui/provider"
import type { ReactNode } from "react"
import { fonts } from "@/lib/fonts"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fonts} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}

export const metadata = {
  title: "Lightfast Chat Documentation",
  description: "Documentation for Lightfast Chat - AI-powered chat application",
}
