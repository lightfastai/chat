"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Coins, TrendingDown } from "lucide-react"

interface CreditBalance {
  balance: number
  monthlyAllocation: number
  periodUsage: number
  periodEnd: number
}

interface CreditBalanceCardProps {
  balance: CreditBalance | null | undefined
}

export function CreditBalanceCard({ balance }: CreditBalanceCardProps) {
  if (balance === undefined) {
    return <CreditBalanceCardSkeleton />
  }

  if (!balance || balance.monthlyAllocation === 0) {
    return <NoCreditBalanceCard />
  }

  const usagePercentage =
    (balance.periodUsage / balance.monthlyAllocation) * 100
  const remainingPercentage =
    (balance.balance / balance.monthlyAllocation) * 100
  const periodEnd = new Date(balance.periodEnd)
  const daysUntilReset = Math.ceil(
    (balance.periodEnd - Date.now()) / (1000 * 60 * 60 * 24),
  )

  // Determine status based on remaining credits
  const getStatusBadge = () => {
    if (remainingPercentage >= 50) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          Healthy
        </Badge>
      )
    } else if (remainingPercentage >= 20) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Low
        </Badge>
      )
    } else {
      return <Badge variant="destructive">Critical</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Credit Balance
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {balance.balance.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">
              / {balance.monthlyAllocation.toLocaleString()} credits
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {balance.periodUsage.toLocaleString()} used this period
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Usage this month</span>
            <span>{Math.round(usagePercentage)}%</span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            Resets in {daysUntilReset} day{daysUntilReset !== 1 ? "s" : ""} (
            {periodEnd.toLocaleDateString()})
          </span>
        </div>

        {balance.balance < 50 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-800 font-medium">
                Running Low
              </span>
            </div>
            <p className="text-sm text-orange-700 mt-1">
              Consider purchasing additional credits or upgrading your plan.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {balance.balance}
            </p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {balance.periodUsage}
            </p>
            <p className="text-xs text-muted-foreground">Used</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NoCreditBalanceCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Credit Balance
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="text-center py-6">
          <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No credit balance found</p>
          <p className="text-sm text-muted-foreground">
            Subscribe to a plan to get credits and start chatting with AI
            models.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function CreditBalanceCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-32 mt-1" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-8" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-40" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="text-center">
            <Skeleton className="h-8 w-12 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto mt-1" />
          </div>
          <div className="text-center">
            <Skeleton className="h-8 w-12 mx-auto" />
            <Skeleton className="h-3 w-12 mx-auto mt-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
