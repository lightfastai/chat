"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PRODUCT_FEATURES } from "@/lib/polar/client"
import { formatNumber } from "@/lib/utils"
import { useAction, useQuery } from "convex/react"
import { Crown, Sparkles, Zap } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import { UpgradeDialog } from "./UpgradeDialog"

export function SubscriptionStatus() {
  const user = useQuery(api.users.current)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)

  const subscriptionStatus = useQuery(
    api.polar.usage.getSubscriptionStatus,
    user ? { userId: user._id } : "skip",
  )
  const limits = useQuery(
    api.polar.usage.checkLimits,
    user ? { userId: user._id } : "skip",
  )

  const createPortalSession = useAction(api.polar.checkout.createCustomerPortal)

  if (!user || !subscriptionStatus || !limits) {
    return null
  }

  const tier = subscriptionStatus.hasActiveSubscription
    ? subscriptionStatus.subscription?.polarProductId === "prod_pro"
      ? "pro"
      : subscriptionStatus.subscription?.polarProductId === "prod_team"
        ? "team"
        : "free"
    : "free"

  const features = PRODUCT_FEATURES[tier]
  const Icon = tier === "team" ? Crown : tier === "pro" ? Zap : Sparkles

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true)
    try {
      const result = await createPortalSession()
      if (result.portalUrl) {
        window.location.href = result.portalUrl
      } else {
        throw new Error("Failed to create portal session")
      }
    } catch (error) {
      console.error("Portal session error:", error)
      toast.error("Failed to open billing portal")
    } finally {
      setIsLoadingPortal(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {features.name} Plan
          </CardTitle>
          <CardDescription>{features.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Token Usage */}
          {limits.limits.tokensPerMonth && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Tokens Used</span>
                <span>
                  {formatNumber(limits.usage.tokensUsed)} /{" "}
                  {formatNumber(limits.limits.tokensPerMonth)}
                </span>
              </div>
              <Progress
                value={limits.percentUsed.tokens}
                className={
                  limits.percentUsed.tokens > 90
                    ? "bg-destructive/20"
                    : limits.percentUsed.tokens > 75
                      ? "bg-warning/20"
                      : ""
                }
              />
            </div>
          )}

          {/* Thread Usage */}
          {limits.limits.threadsPerMonth && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Threads Created</span>
                <span>
                  {limits.usage.threadsCreated} /{" "}
                  {limits.limits.threadsPerMonth}
                </span>
              </div>
              <Progress value={limits.percentUsed.threads} />
            </div>
          )}

          {/* Message Usage */}
          {limits.limits.messagesPerDay && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Messages Today</span>
                <span>
                  {limits.usage.messagesSent} / {limits.limits.messagesPerDay}
                </span>
              </div>
              <Progress value={limits.percentUsed.messages} />
            </div>
          )}

          {/* Upgrade Button */}
          {tier === "free" && (
            <Button
              className="w-full"
              variant="default"
              onClick={() => setShowUpgradeDialog(true)}
            >
              Upgrade to Pro
            </Button>
          )}

          {/* Manage Subscription */}
          {subscriptionStatus.hasActiveSubscription && (
            <Button
              className="w-full"
              variant="outline"
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
            >
              {isLoadingPortal ? "Loading..." : "Manage Subscription"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        currentTier={tier}
      />
    </>
  )
}
