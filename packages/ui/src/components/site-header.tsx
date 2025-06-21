import Link from "next/link"
import type * as React from "react"
import { cn } from "../lib/utils"
import { Button } from "./button"
import { Icons } from "./icons"

export interface SiteHeaderProps {
  className?: string
  logoHref?: string
  githubUrl?: string
  docsUrl?: string
  signInHref?: string
  showLogo?: boolean
  showGitHub?: boolean
  showDocs?: boolean
  showSignIn?: boolean
  children?: React.ReactNode
}

export function SiteHeader({
  className,
  logoHref = "/",
  githubUrl,
  docsUrl,
  signInHref = "/signin",
  showLogo = true,
  showGitHub = true,
  showDocs = true,
  showSignIn = true,
  children,
}: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showLogo && (
            <Link href={logoHref}>
              <Icons.logo className="w-6 h-5 text-foreground" />
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          {showDocs && docsUrl && (
            <Link
              href={docsUrl}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </Link>
          )}
          {showGitHub && githubUrl && (
            <Link
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </Link>
          )}
          {children}
          {showSignIn && (
            <Link href={signInHref}>
              <Button variant="outline">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
