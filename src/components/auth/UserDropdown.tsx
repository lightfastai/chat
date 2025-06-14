"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
import {
  ChevronDown,
  CreditCard,
  Crown,
  LogOut,
  Settings,
  Sparkles,
  User,
  Zap,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { cn } from "../../lib/utils"
import { UpgradeDialog } from "../subscription/UpgradeDialog"

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
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  // Get subscription status
  const subscriptionStatus = useQuery(
    api.polar.usage.getSubscriptionStatus,
    currentUser ? { userId: currentUser._id } : "skip",
  )

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

  // Determine user tier
  const tier = subscriptionStatus?.hasActiveSubscription
    ? subscriptionStatus.subscription?.polarProductId === "prod_pro"
      ? "pro"
      : subscriptionStatus.subscription?.polarProductId === "prod_team"
        ? "team"
        : "free"
    : "free"

  const tierConfig = {
    free: { label: "Free", icon: Sparkles, color: "bg-gray-500" },
    pro: { label: "Pro", icon: Zap, color: "bg-blue-500" },
    team: { label: "Team", icon: Crown, color: "bg-purple-500" },
  }

  const TierIcon = tierConfig[tier].icon

  return (
    <>
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
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium leading-none">
                  {displayName}
                </p>
                <Badge variant="secondary" className="text-xs">
                  <TierIcon className="w-3 h-3 mr-1" />
                  {tierConfig[tier].label}
                </Badge>
              </div>
              {showEmail && (
                <p className="text-xs leading-none text-muted-foreground">
                  {displayEmail}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Subscription Management */}
          {tier === "free" && (
            <>
              <DropdownMenuItem
                onClick={() => setShowUpgradeDialog(true)}
                className="cursor-pointer text-primary"
              >
                <Zap className="mr-2 h-4 w-4" />
                <span>Upgrade to Pro</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {tier !== "free" && (
            <>
              <DropdownMenuItem asChild>
                <a href="/chat/settings/billing" className="cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Billing & Usage</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {showSettings && (
            <>
              <DropdownMenuItem asChild>
                <a href={settingsHref} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
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

      {/* Upgrade Dialog */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        currentTier={tier}
      />
    </>
  )
}
