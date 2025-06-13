interface SettingsHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function SettingsHeader({
  title,
  description,
  children,
}: SettingsHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b pb-6 mb-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
