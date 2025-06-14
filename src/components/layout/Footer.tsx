import { cn } from "@/lib/utils"
import Link from "next/link"

interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        "flex items-center justify-center py-3 px-6 text-xs text-muted-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Link
          href="https://lightfast.ai"
          className="hover:text-foreground transition-colors"
        >
          Lightfast
        </Link>
        <span>•</span>
        <Link
          href="https://lightfast.ai/legal/terms"
          className="hover:text-foreground transition-colors"
        >
          Terms
        </Link>
        <span>•</span>
        <Link
          href="https://lightfast.ai/legal/privacy"
          className="hover:text-foreground transition-colors"
        >
          Privacy
        </Link>
        <span>•</span>
        <Link
          href="https://github.com/lightfastai/chat/blob/main/LICENSE.md"
          className="hover:text-foreground transition-colors"
        >
          License
        </Link>
      </div>
    </footer>
  )
}
