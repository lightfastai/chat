"use client"

import { Button } from "@/components/ui/button"
import { useConvexAuth } from "convex/react"
import { LogIn } from "lucide-react"
import Link from "next/link"
import { UserDropdown } from "./UserDropdown"

interface UserDropdownWithGuestProps {
  className?: string
  showEmail?: boolean
  showSettings?: boolean
  settingsHref?: string
  onSignOut?: () => void
  redirectAfterSignOut?: boolean
}

export function UserDropdownWithGuest(props: UserDropdownWithGuestProps) {
  const { isAuthenticated, isLoading } = useConvexAuth()

  if (isLoading) {
    return (
      <Button variant="ghost" className={props.className} disabled>
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
      </Button>
    )
  }

  if (!isAuthenticated) {
    return (
      <Link href="/signin">
        <Button variant="outline" className={props.className}>
          <LogIn className="w-4 h-4 mr-2" />
          Sign In
        </Button>
      </Link>
    )
  }

  return <UserDropdown {...props} />
}
