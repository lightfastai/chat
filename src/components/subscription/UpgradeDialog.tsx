"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { POLAR_CONFIG } from "@/lib/polar/client"
import { useAction } from "convex/react"
import { Check, Crown, Zap } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTier?: "free" | "pro" | "team"
}

export function UpgradeDialog({
  open,
  onOpenChange,
  currentTier = "free",
}: UpgradeDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const createCheckout = useAction(api.polar.checkout.createCheckout)

  const handleUpgrade = async (tier: "pro" | "team") => {
    setIsLoading(true)
    try {
      const productId =
        tier === "pro" ? POLAR_CONFIG.products.pro : POLAR_CONFIG.products.team

      if (!productId) {
        throw new Error(`Product ID not configured for ${tier} tier`)
      }

      const result = await createCheckout({ productId })

      if (result.checkoutUrl) {
        // Redirect to Polar checkout
        window.location.href = result.checkoutUrl
      } else {
        throw new Error("Failed to create checkout session")
      }
    } catch (error) {
      console.error("Upgrade error:", error)
      toast.error("Failed to start upgrade process")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            Choose the plan that best fits your needs
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-4 mt-4">
          {/* Free Tier */}
          <Card className={currentTier === "free" ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Free</span>
                {currentTier === "free" && (
                  <span className="text-sm text-muted-foreground">Current</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-4">$0</div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  100K tokens/month
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  50 threads/month
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Basic models only
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Pro Tier */}
          <Card className={currentTier === "pro" ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Pro
                </span>
                {currentTier === "pro" && (
                  <span className="text-sm text-muted-foreground">Current</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-4">
                $20<span className="text-sm font-normal">/month</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  1M tokens/month included
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  $0.01 per 1K tokens after
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Unlimited threads
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  All AI models
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Custom API keys
                </li>
              </ul>
              {currentTier === "free" && (
                <Button
                  className="w-full mt-4"
                  onClick={() => handleUpgrade("pro")}
                  disabled={isLoading}
                >
                  Upgrade to Pro
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Team Tier */}
          <Card className={currentTier === "team" ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Team
                </span>
                {currentTier === "team" && (
                  <span className="text-sm text-muted-foreground">Current</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-4">
                $50<span className="text-sm font-normal">/month + usage</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Pay-as-you-go pricing
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Unlimited everything
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Advanced features
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Priority support
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Usage analytics
                </li>
              </ul>
              {currentTier !== "team" && (
                <Button
                  className="w-full mt-4"
                  onClick={() => handleUpgrade("team")}
                  disabled={isLoading}
                >
                  Upgrade to Team
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
