import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { Key, User } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

interface SettingsLayoutProps {
  children: React.ReactNode
}

const settingsNavigation = [
  {
    name: "Profile",
    href: "/settings/account",
    icon: User,
  },
  {
    name: "API Keys",
    href: "/settings/api-keys",
    icon: Key,
  },
]

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  // Check authentication
  const [authenticated, user] = await Promise.all([
    isAuthenticated(),
    getCurrentUser(),
  ])

  if (!authenticated || !user) {
    redirect("/signin")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex max-w-6xl mx-auto">
        {/* Settings Navigation Sidebar */}
        <div className="w-64 border-r bg-muted/10 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Settings</h2>
            <p className="text-sm text-muted-foreground">
              Manage your account and preferences
            </p>
          </div>

          <nav className="space-y-2">
            {settingsNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 p-6">{children}</div>
      </div>
    </div>
  )
}
