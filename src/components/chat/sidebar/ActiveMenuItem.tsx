"use client"

import { SidebarMenuButton } from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import type { Id } from "../../../../convex/_generated/dataModel"

interface ActiveMenuItemProps {
  threadId: Id<"threads"> | "new"
  href: string
  children: React.ReactNode
  className?: string
  size?: "default" | "sm" | "lg"
  prefetch?: boolean
}

// Client component that handles active state for individual menu items
export function ActiveMenuItem({
  threadId,
  href,
  children,
  className = "w-full h-auto p-2.5 text-left flex items-center justify-between",
  size = "default",
  prefetch = true,
}: ActiveMenuItemProps) {
  const pathname = usePathname()

  // Extract the ID from the current pathname
  const currentUrlId = useMemo(() => {
    if (pathname === "/chat") return "new"
    const match = pathname.match(/^\/chat\/(.+)$/)
    return match ? match[1] : "new"
  }, [pathname])

  // Determine if this thread is active
  // Need to handle both clientId and server ID matching
  const isActive = useMemo(() => {
    if (threadId === "new") {
      return pathname === "/chat"
    }

    // Extract the ID from the href for comparison
    const hrefMatch = href.match(/^\/chat\/(.+)$/)
    const hrefId = hrefMatch ? hrefMatch[1] : null

    if (!hrefId) return false

    // If current URL has clientId and href has clientId, compare them
    // If current URL has server ID and href has server ID, compare them
    // This handles the case where user navigates to clientId URL but sidebar shows server ID
    return currentUrlId === hrefId
  }, [pathname, href, threadId])

  return (
    <Link href={href} prefetch={prefetch} className="block overflow-visible">
      <SidebarMenuButton className={className} size={size} isActive={isActive}>
        {children}
      </SidebarMenuButton>
    </Link>
  )
}
