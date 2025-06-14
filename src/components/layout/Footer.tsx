import { cn } from "@/lib/utils"

interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        "border-t",
        "flex items-center justify-center py-3 px-6 text-xs text-muted-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span>Lightfast Chat</span>
        <span>•</span>
        <span>v1.0.0</span>
        <span>•</span>
        <span>Terms</span>
        <span>•</span>
        <span>Privacy</span>
      </div>
    </footer>
  )
}
