import { cn } from "@/lib/utils"

interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        "border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "flex items-center justify-center py-4 px-6 text-sm text-muted-foreground",
        className,
      )}
    >
      <div className="flex items-center space-x-2">
        <span>Lightfast Chat</span>
        <span>•</span>
        <span>v1.0.0</span>
      </div>
    </footer>
  )
}
