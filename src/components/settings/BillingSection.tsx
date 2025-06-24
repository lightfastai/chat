"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { SettingsHeader } from "./SettingsHeader"
import { SubscriptionCard } from "./SubscriptionCard"
import { CreditBalanceCard } from "./CreditBalanceCard"
import { TransactionHistory } from "./TransactionHistory"
import { Separator } from "@/components/ui/separator"

interface BillingSectionProps {
  userId: Id<"users">
}

export function BillingSection({ userId }: BillingSectionProps) {
  const subscription = useQuery(api.polar.queries.getActiveSubscription, { userId })
  const creditBalance = useQuery(api.polar.queries.getCreditBalance, { userId })
  const transactions = useQuery(api.polar.queries.getRecentTransactions, { userId, limit: 10 })

  return (
    <section className="space-y-6">
      <div>
        <SettingsHeader title="Billing & Credits" />
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription and monitor credit usage
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <SubscriptionCard subscription={subscription} userId={userId} />
        <CreditBalanceCard balance={creditBalance} />
      </div>
      
      <Separator />
      
      <TransactionHistory transactions={transactions} />
    </section>
  )
}