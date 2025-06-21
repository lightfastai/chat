"use client"

import Link from "next/link"
import type * as React from "react"
import { cn } from "../lib/utils"
import type { SiteConfig } from "../types/site"
import { Button } from "./button"
import { Icons } from "./icons"

export interface SiteHeaderProps<T extends string = string> {
  className?: string
  siteConfig: SiteConfig<T>
  showLogo?: boolean
  showGitHub?: boolean
  showSignIn?: boolean
  signInHref?: string
  children?: React.ReactNode
}

export function SiteHeader<T extends string = string>({
  className,
  siteConfig,
  showLogo = true,
  showGitHub = true,
  showSignIn = true,
  signInHref = "/signin",
  children,
}: SiteHeaderProps<T>) {
  const links = siteConfig.links as Record<
    string,
    { href: string; title?: string }
  >

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
            <Link href="/">
              <Icons.logo className="w-6 h-5 text-foreground" />
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          {showGitHub && links?.github && (
            <Link
              href={links.github.href}
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
