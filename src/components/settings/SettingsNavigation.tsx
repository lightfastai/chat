"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface SettingsNavigationProps {
  children?: React.ReactNode
  activeTab?: string
}

export function SettingsNavigation({
  children,
  activeTab: propActiveTab,
}: SettingsNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Determine current tab from pathname
  const getCurrentTab = () => {
    if (pathname.includes("/billing")) return "billing"
    if (pathname.includes("/api-keys")) return "api-keys"
    return "profile"
  }

  const [activeTab, setActiveTab] = useState(propActiveTab || getCurrentTab())

  // Update tab when pathname changes
  useEffect(() => {
    if (!propActiveTab) {
      setActiveTab(getCurrentTab())
    }
  }, [pathname, propActiveTab])

  const handleTabChange = (value: string) => {
    setActiveTab(value)

    // Navigate to the appropriate route
    if (value === "profile") {
      router.push("/chat/settings/profile")
    } else if (value === "api-keys") {
      router.push("/chat/settings/api-keys")
    } else if (value === "billing") {
      router.push("/chat/settings/billing")
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full max-w-lg grid-cols-3">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>

      {children && (
        <TabsContent value={activeTab} className="mt-6">
          {children}
        </TabsContent>
      )}
    </Tabs>
  )
}
