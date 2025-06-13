import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SettingsCardProps {
  children: React.ReactNode
  className?: string
}

export function SettingsCard({ children, className }: SettingsCardProps) {
  return (
    <Card className={cn("border border-border shadow-none", className)}>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  )
}

interface SettingsCardItemProps {
  title: string
  description: string
  children: React.ReactNode
  status?: string
  statusVariant?: "default" | "success" | "warning" | "destructive"
  className?: string
}

export function SettingsCardItem({
  title,
  description,
  children,
  status,
  statusVariant = "default",
  className,
}: SettingsCardItemProps) {
  const statusColors = {
    default: "text-muted-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    destructive: "text-red-600 dark:text-red-400",
  }

  return (
    <SettingsCard className={className}>
      <div className="flex items-start justify-between gap-8 p-6">
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
    </SettingsCard>
  )
}
