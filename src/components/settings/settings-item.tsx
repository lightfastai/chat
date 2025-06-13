import { cn } from "@/lib/utils"

interface SettingsItemProps {
  title: string
  description: string
  children: React.ReactNode
  className?: string
}

export function SettingsItem({
  title,
  description,
  children,
  className,
}: SettingsItemProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-8 py-6", className)}
    >
      <div className="flex-1 space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground pr-8">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

interface SettingsItemWithStatusProps {
  title: string
  description: string
  status?: string
  statusVariant?: "default" | "success" | "warning" | "destructive"
  children: React.ReactNode
  className?: string
}

export function SettingsItemWithStatus({
  title,
  description,
  status,
  statusVariant = "default",
  children,
  className,
}: SettingsItemWithStatusProps) {
  const statusColors = {
    default: "text-muted-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    destructive: "text-red-600 dark:text-red-400",
  }

  return (
    <div
      className={cn("flex items-start justify-between gap-8 py-6", className)}
    >
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{title}</h3>
          {status && (
            <span className={cn("text-xs", statusColors[statusVariant])}>
              {status}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground pr-8">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}
