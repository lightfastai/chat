import { BackButton } from "@/components/settings/back-button"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Key, User } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

interface SettingsLayoutProps {
  children: React.ReactNode
}

const settingsNavigation = [
  {
    name: "Account",
    href: "/settings/account",
    icon: User,
    description: "Manage your profile and account settings",
  },
  {
    name: "API Keys",
    href: "/settings/api-keys",
    icon: Key,
    description: "Configure your AI provider API keys",
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
      {/* Header with back navigation */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <BackButton fallbackHref="/chat">Back to Chat</BackButton>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8 max-w-6xl mx-auto">
          {/* Settings Navigation Sidebar */}
          <div className="w-64 shrink-0">
            <div className="sticky top-8">
              <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Settings
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your account and application preferences
                </p>
              </div>

              <nav className="space-y-1">
                {settingsNavigation.map((item) => {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-start gap-3 rounded-lg px-3 py-3 text-sm transition-all",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    >
                      <item.icon className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-accent-foreground" />
                      <div className="flex-1 space-y-1">
                        <div className="font-medium leading-none">
                          {item.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 min-w-0">
            <div className="max-w-2xl">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
