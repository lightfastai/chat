"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowUpCircle, ArrowDownCircle, History, Plus, Minus } from "lucide-react"
import type { Id } from "../../../convex/_generated/dataModel"

interface Transaction {
  _id: Id<"creditTransactions">
  type: "allocation" | "purchase" | "usage" | "refund" | "adjustment"
  amount: number
  balance: number
  description: string
  createdAt: number
}

interface TransactionHistoryProps {
  transactions: Transaction[] | null | undefined
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  if (transactions === undefined) {
    return <TransactionHistorySkeleton />
  }

  if (!transactions || transactions.length === 0) {
    return <NoTransactionsCard />
  }

  const getTransactionIcon = (_type: string, amount: number) => {
    if (amount > 0) {
      return <ArrowUpCircle className="h-4 w-4 text-green-600" />
    } else {
      return <ArrowDownCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getTransactionBadge = (type: string) => {
    const variants = {
      allocation: { variant: "default" as const, label: "Allocation" },
      purchase: { variant: "default" as const, label: "Purchase" },
      usage: { variant: "secondary" as const, label: "Usage" },
      refund: { variant: "outline" as const, label: "Refund" },
      adjustment: { variant: "outline" as const, label: "Adjustment" },
    }
    
    const config = variants[type as keyof typeof variants] || variants.usage
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatAmount = (amount: number) => {
    const prefix = amount > 0 ? "+" : ""
    return `${prefix}${amount.toLocaleString()}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Recent Transactions
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction._id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getTransactionIcon(transaction.type, transaction.amount)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getTransactionBadge(transaction.type)}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(transaction.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate">
                      {transaction.description}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {transaction.amount > 0 ? (
                      <Plus className="h-3 w-3 text-green-600" />
                    ) : (
                      <Minus className="h-3 w-3 text-red-600" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        transaction.amount > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatAmount(transaction.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Balance: {transaction.balance.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function NoTransactionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Recent Transactions
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="text-center py-8">
          <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No transactions yet</p>
          <p className="text-sm text-muted-foreground">
            Your credit transactions will appear here once you start using the service.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function TransactionHistorySkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-4 w-12 ml-auto" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}