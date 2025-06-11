import type { Metadata } from "next"
import "./globals.css"
import { ConvexClientProvider } from "@/lib/ConvexProvider"
import { cn } from "@/lib/utils"
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
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
      <html lang="en">
        <body className={cn(fonts, "dark")}>
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  )
}
