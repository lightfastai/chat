import { cn } from "@/lib/utils"
import { Dot } from "lucide-react"
import Link from "next/link"

interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn("w-full py-8", className)}>
      <div className="mx-auto max-w-7xl">
        <div className="pr-16">
          <div className="text-muted-foreground flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
            <div className="flex items-center gap-4">
              <Link
                target="_blank"
                href="https://github.com/lightfastai/chat"
                aria-label="GitHub"
                className="transition-transform duration-200 hover:scale-110"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="hover:text-foreground size-4 transition-colors duration-200"
                  role="img"
                  aria-label="GitHub"
                >
                  <path
                    fill="currentColor"
                    d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
                  />
                </svg>
              </Link>
            </div>

            <div className="flex flex-col items-center gap-2">
              <nav className="flex items-center gap-2 md:gap-4">
                <Link
                  prefetch={true}
                  href="/"
                  className="hover:text-foreground text-xs transition-all duration-200 hover:underline hover:underline-offset-4"
                >
                  Home
                </Link>
                <Dot className="size-2" />
                <Link
                  prefetch={true}
                  href="/legal/privacy"
                  className="hover:text-foreground text-xs transition-all duration-200 hover:underline hover:underline-offset-4"
                >
                  Privacy
                </Link>
                <Dot className="size-2" />
                <Link
                  prefetch={true}
                  href="/legal/terms"
                  className="hover:text-foreground text-xs transition-all duration-200 hover:underline hover:underline-offset-4"
                >
                  Terms
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <span className="group relative cursor-default text-xs">
                <span className="group-hover:text-foreground relative inline-block transition-all duration-300 group-hover:-translate-y-1">
                  Lightfast
                </span>
                <span className="group-hover:text-primary relative mx-1 inline-block transition-all duration-300 group-hover:opacity-0">
                  Inc.
                </span>
                <span className="group-hover:text-muted relative inline-block transition-all duration-300 group-hover:opacity-0">
                  ©
                </span>
                <span className="group-hover:text-foreground relative ml-1 inline-block transition-all duration-300 group-hover:-translate-y-1">
                  {new Date().getFullYear()}
                </span>
                <span className="from-primary/40 via-primary to-primary/40 absolute bottom-0 left-0 h-[1px] w-0 bg-gradient-to-r transition-all duration-500 group-hover:w-full" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
