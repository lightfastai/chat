import { BackButton } from "@/components/settings/back-button"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"
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
        <div className="flex h-16 items-center gap-4 px-6">
          <BackButton fallbackHref="/chat">
            <ArrowLeft className="h-4 w-4" />
          </BackButton>
          <h1 className="text-lg font-semibold">Chat Settings</h1>
        </div>
      </div>

      <div className="flex">
        {/* Vercel-style sidebar */}
        <div className="w-64 border-r bg-muted/20">
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                  General
                </h2>
                <nav className="space-y-1">
                  {settingsNavigation.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm transition-colors",
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
          <div className="mx-auto max-w-4xl p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
