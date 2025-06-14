import { source } from "@/lib/source"
import { RootToggle } from "fumadocs-ui/components/layout/root-toggle"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider"
import type { ReactNode } from "react"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout
        tree={source.pageTree}
        nav={{
          title: "Lightfast Chat",
          url: "/",
        }}
        sidebar={{
          banner: (
            <RootToggle
              options={[
                {
                  title: "Documentation",
                  description: "Learn how to use Lightfast Chat",
                  url: "/docs",
                  icon: (
                    <svg
                      className="size-9 shrink-0 rounded-md bg-gradient-to-t from-fd-background/80 p-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-label="Documentation"
                    >
                      <title>Documentation</title>
                      <path
                        fill="currentColor"
                        d="M4 19h16v2H8zm4-6h8v2H8zm-4-4h16v2H4zm4-6h8v2H8z"
                      />
                    </svg>
                  ),
                },
              ]}
            />
          ),
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  )
}
