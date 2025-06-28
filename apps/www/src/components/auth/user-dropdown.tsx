"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lightfast/ui/components/ui/avatar"
import { Button } from "@lightfast/ui/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lightfast/ui/components/ui/dropdown-menu"
import { cn } from "@lightfast/ui/lib/utils"
import { useQuery } from "convex/react"
import { ChevronDown, LogOut, Settings, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "../../../convex/_generated/api"

interface UserDropdownProps {
  className?: string
  showEmail?: boolean
  showSettings?: boolean
  settingsHref?: string
  onSignOut?: () => void
  redirectAfterSignOut?: boolean
}

export function UserDropdown({
  className,
  showEmail = true,
  showSettings = true,
  settingsHref = "/chat/settings",
  onSignOut,
  redirectAfterSignOut = true,
}: UserDropdownProps) {
  const { signOut } = useAuthActions()
  const currentUser = useQuery(api.users.current)
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      onSignOut?.()
      await signOut()

      // Redirect to home page after successful signout
      if (redirectAfterSignOut) {
        router.push("/")
      }
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const displayName = currentUser?.name || currentUser?.email || "User"
  const displayEmail = currentUser?.email || "No email"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn("gap-2 h-10", className)}>
          <Avatar className="w-6 h-6">
            {currentUser?.image && (
              <AvatarImage
                src={currentUser.image}
                alt={displayName}
                className="object-cover"
              />
            )}
            <AvatarFallback className="text-xs">
              <User className="w-3 h-3" />
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{displayName}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {showEmail && (
              <p className="text-xs leading-none text-muted-foreground">
                {displayEmail}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {showSettings && (
          <>
            <DropdownMenuItem asChild>
              <Link
                href={settingsHref}
                className="cursor-pointer"
                prefetch={true}
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
