import { cn } from "@/lib/utils"

interface SettingsSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-1">
        <h3 className="text-lg font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
