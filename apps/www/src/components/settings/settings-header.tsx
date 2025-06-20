import { Badge } from "@repo/ui/components/badge"

interface SettingsHeaderProps {
  title: string
  badge?: string
}

export function SettingsHeader({ title, badge }: SettingsHeaderProps) {
  return (
    <div className="flex items-center space-x-2">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {badge && (
        <Badge variant="secondary" className="text-xs">
          {badge}
        </Badge>
      )}
    </div>
  )
}
