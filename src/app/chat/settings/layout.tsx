import { SettingsNavigation } from "../../../components/settings/SettingsNavigation"

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Navigation with content */}
        <SettingsNavigation>{children}</SettingsNavigation>
      </div>
    </div>
  )
}
