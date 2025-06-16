"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface SettingsNavigationProps {
  children: React.ReactNode
}

export function SettingsNavigation({ children }: SettingsNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Determine current tab from pathname
  const getCurrentTab = () => {
    if (pathname.includes("/api-keys")) return "api-keys"
    return "profile"
  }

  const [activeTab, setActiveTab] = useState(getCurrentTab())

  // Update tab when pathname changes
  useEffect(() => {
    setActiveTab(getCurrentTab())
  }, [pathname])

  const handleTabChange = (value: string) => {
    setActiveTab(value)

    // Navigate to the appropriate route
    if (value === "profile") {
      router.push("/chat/settings")
    } else if (value === "api-keys") {
      router.push("/chat/settings/api-keys")
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full max-w-lg grid-cols-2">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="api-keys">API Keys</TabsTrigger>
      </TabsList>

      <TabsContent value={activeTab} className="mt-6">
        {children}
      </TabsContent>
    </Tabs>
  )
}
