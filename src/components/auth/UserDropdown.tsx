"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthActions } from "@convex-dev/auth/react"
import { useQuery } from "convex/react"
import { ChevronDown, LogOut, Settings, User } from "lucide-react"
import { api } from "../../../convex/_generated/api"

interface UserDropdownProps {
  className?: string
  showEmail?: boolean
  showSettings?: boolean
  settingsHref?: string
  onSignOut?: () => void
}

export function UserDropdown({
  className,
  showEmail = true,
  showSettings = true,
  settingsHref = "/profile",
  onSignOut,
}: UserDropdownProps) {
  const { signOut } = useAuthActions()
  const currentUser = useQuery(api.users.current)

  const handleSignOut = async () => {
    try {
      onSignOut?.()
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const displayName = currentUser?.name || currentUser?.email || "User"
  const displayEmail = currentUser?.email || "No email"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`gap-2 h-10 ${className || ""}`}>
          <Avatar className="w-6 h-6">
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
              <a href={settingsHref} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </a>
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
