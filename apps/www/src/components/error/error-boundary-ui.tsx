"use client"

import { Button } from "@lightfast/ui/components/ui/button"
import { cn } from "@lightfast/ui/lib/utils"
import type { LucideIcon } from "lucide-react"
import { env } from "../../env"

export interface ErrorBoundaryAction {
  label: string
  icon?: LucideIcon
  onClick?: () => void
  href?: string
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive"
}

export interface ErrorBoundaryUIProps {
  icon: LucideIcon
  iconColor?: string
  title: string
  description: string
  details?: string
  actions?: ErrorBoundaryAction[]
  error?: Error & { digest?: string }
  showErrorDetails?: boolean
  className?: string
}

export function ErrorBoundaryUI({
  icon: Icon,
  iconColor = "text-destructive",
  title,
  description,
  details,
  actions = [],
  error,
  showErrorDetails = env.NODE_ENV === "development",
  className,
}: ErrorBoundaryUIProps) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center gap-6 px-4 py-8",
        className,
      )}
    >
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div
          className={cn(
            "rounded-full p-3",
            iconColor === "text-destructive" && "bg-destructive/10",
            iconColor === "text-amber-500" && "bg-amber-500/10",
            iconColor === "text-blue-500" && "bg-blue-500/10",
          )}
        >
          <Icon className={cn("h-6 w-6", iconColor)} />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>

        <p className="text-sm text-muted-foreground">{description}</p>

        {details && <p className="text-sm text-muted-foreground">{details}</p>}

        {showErrorDetails && error?.message && (
          <details className="mt-2 w-full rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium text-destructive">
              Error details
            </summary>
            <pre className="mt-2 overflow-auto text-xs text-muted-foreground">
              {error.message}
              {error.stack && (
                <>
                  {"\n\n"}
                  Stack trace:
                  {"\n"}
                  {error.stack}
                </>
              )}
              {error.digest && (
                <>
                  {"\n\n"}
                  Error ID: {error.digest}
                </>
              )}
            </pre>
          </details>
        )}

        {actions.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {actions.map((action, index) => {
              const buttonProps = {
                variant:
                  action.variant || (index === 0 ? "default" : "outline"),
                size: "sm" as const,
                onClick: action.onClick,
              }

              if (action.href) {
                return (
                  <Button key={action.label} asChild {...buttonProps}>
                    <a href={action.href}>
                      {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                      {action.label}
                    </a>
                  </Button>
                )
              }

              return (
                <Button key={action.label} {...buttonProps}>
                  {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                  {action.label}
                </Button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
