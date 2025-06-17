import type { Metadata } from "next"
import "./globals.css"
import { ConvexClientProvider } from "@/lib/ConvexProvider"
import { cn } from "@/lib/utils"
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Toaster } from "sonner"
import { fonts } from "../lib/fonts"

export const metadata: Metadata = {
  title: "Chat App",
  description: "A Convex Next.js chat application",
}

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={cn(fonts, "dark", "flex min-h-screen flex-col")}>
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <Toaster theme="dark" position="top-right" />
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  )
}
