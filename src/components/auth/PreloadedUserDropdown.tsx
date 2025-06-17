"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import type { Preloaded } from "convex/react"
import { usePreloadedQuery } from "convex/react"
import { ChevronDown, ExternalLink, LogOut, Settings, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { api } from "../../../convex/_generated/api"
import { cn } from "../../lib/utils"

interface PreloadedUserDropdownProps {
  preloadedUser: Preloaded<typeof api.users.current>
  className?: string
  showEmail?: boolean
  showSettings?: boolean
  settingsHref?: string
  onSignOut?: () => void
  redirectAfterSignOut?: boolean
}

export function PreloadedUserDropdown({
  preloadedUser,
  className,
  showEmail = true,
  showSettings = true,
  settingsHref = "/chat/settings",
  onSignOut,
  redirectAfterSignOut = true,
}: PreloadedUserDropdownProps) {
  const { signOut } = useAuthActions()
  const router = useRouter()

  // This will instantly hydrate from the preloaded data without any network request
  const currentUser = usePreloadedQuery(preloadedUser)

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
        <DropdownMenuItem asChild>
          <Link href="/docs" className="cursor-pointer" prefetch={true}>
            <ExternalLink className="mr-2 h-4 w-4" />
            <span>Docs</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="https://github.com/lightfastai/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            <span>GitHub</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
