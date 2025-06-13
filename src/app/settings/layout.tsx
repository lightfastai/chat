import { BackButton } from "@/components/settings/back-button"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { redirect } from "next/navigation"

interface SettingsLayoutProps {
  children: React.ReactNode
}

const settingsNavigation = [
  {
    name: "Account",
    href: "/settings/account",
  },
  {
    name: "API Keys",
    href: "/settings/api-keys",
  },
]

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  // Check authentication with proper SSR
  const [authenticated, user] = await Promise.all([
    isAuthenticated(),
    getCurrentUser(),
  ])

  if (!authenticated || !user) {
    redirect("/signin")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Vercel-style header */}
      <div className="border-b">
        <div className="flex flex-col gap-3 px-12 py-8">
          <h1 className="text-2xl font-bold">Chat Settings</h1>
          <BackButton fallbackHref="/chat" />
        </div>
      </div>

      <div className="flex">
        {/* Clean sidebar without background or border */}
        <div className="w-64 flex justify-center">
          <div className="pt-4 px-4">
            <div className="space-y-4">
              <div>
                <h2 className="mb-2 text-sm font-medium text-muted-foreground text-center">
                  General
                </h2>
                <nav className="space-y-1">
                  {settingsNavigation.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm transition-colors text-center",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1">
          <div className="mx-auto max-w-4xl pt-4 px-8 pb-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
