"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { PageTree } from "fumadocs-core/server"
import { cn } from "@repo/ui/lib/utils"

interface CustomSidebarProps {
  tree?: PageTree.Root
  className?: string
}

export function CustomSidebar({ tree, className }: CustomSidebarProps) {
  const pathname = usePathname()
  const isDocsPage = pathname.startsWith("/docs")
  const isAPIPage = pathname.startsWith("/api")

  return (
    <div className={cn("w-64 min-h-screen bg-background", className)}>
      {/* Header with Logo and Navigation */}
      <div className="p-6">
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="https://lightfast.ai" 
            className="text-lg font-semibold hover:text-primary transition-colors"
          >
            Lightfast
          </Link>
        </div>
        
        <nav className="flex gap-4 mb-8">
          <Link
            href="/docs"
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              isDocsPage 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Docs
          </Link>
          <Link
            href="/api"
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              isAPIPage
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            API
          </Link>
        </nav>
      </div>

      {/* Docs Navigation - Only show on docs pages */}
      {isDocsPage && tree && (
        <div className="px-6">
          <div className="space-y-2">
            {tree.children.map((item, itemIndex) => (
              <div key={`${item.name}-${itemIndex}`} className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  {item.name}
                </div>
                {item.type === "folder" && (
                  <div className="space-y-1 ml-2">
                    {item.children.map((page, pageIndex) => {
                      if (page.type !== "page") return null
                      
                      const isActive = page.url === pathname
                      
                      return (
                        <Link
                          key={`${page.url}-${pageIndex}`}
                          href={page.url}
                          className={cn(
                            "block px-3 py-2 text-sm rounded-md transition-colors",
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                          )}
                        >
                          {page.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}