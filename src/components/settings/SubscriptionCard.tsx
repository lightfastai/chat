"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CreditCard, Calendar, AlertCircle } from "lucide-react"
import type { Id } from "../../../convex/_generated/dataModel"

interface Subscription {
  _id: Id<"polarSubscriptions">
  planType: "starter"
  status: string
  currentPeriodEnd: number
  cancelAtPeriodEnd: boolean
}

interface SubscriptionCardProps {
  subscription: Subscription | null | undefined
  userId: Id<"users">
}

export function SubscriptionCard({ subscription, userId }: SubscriptionCardProps) {
  if (subscription === undefined) {
    return <SubscriptionCardSkeleton />
  }

  if (!subscription) {
    return <NoSubscriptionCard userId={userId} />
  }

  const isActive = subscription.status === "active"
  const periodEnd = new Date(subscription.currentPeriodEnd)
  const isExpiringSoon = subscription.cancelAtPeriodEnd

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : subscription.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">Starter Plan</h3>
          <p className="text-sm text-muted-foreground">$8/month • 800 credits</p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {isExpiringSoon ? "Expires" : "Renews"} on {periodEnd.toLocaleDateString()}
          </span>
        </div>
        
        {isExpiringSoon && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Your subscription will expire on {periodEnd.toLocaleDateString()}
            </span>
          </div>
        )}
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plan</span>
            <span>Starter</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price</span>
            <span>$8.00/month</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Credits</span>
            <span>800/month</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          Manage Billing
        </Button>
        {!isExpiringSoon && (
          <Button variant="outline" size="sm" className="flex-1">
            Cancel Plan
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

function NoSubscriptionCard({ userId: _userId }: { userId: Id<"users"> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          No Active Plan
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Subscribe to get 800 credits per month and access to all AI models.
        </p>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Starter Plan</span>
            <span className="font-medium">$8/month</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Credits included</span>
            <span>800/month</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">All AI models</span>
            <span>✓ Included</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button className="w-full">
          Subscribe Now
        </Button>
      </CardFooter>
    </Card>
  )
}

function SubscriptionCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-40 mt-1" />
        </div>
        
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  )
}