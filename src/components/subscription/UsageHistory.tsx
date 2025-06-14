"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatNumber } from "@/lib/utils"
import { useQuery } from "convex/react"
import { format } from "date-fns"
import { TrendingDown, TrendingUp } from "lucide-react"
import { api } from "../../../convex/_generated/api"

export function UsageHistory() {
  const user = useQuery(api.users.current)
  const usageHistory = useQuery(
    api.polar.usage.getUsageHistory,
    user ? { userId: user._id, limit: 30 } : "skip",
  )

  if (!user || !usageHistory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage History</CardTitle>
          <CardDescription>Loading usage data...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Calculate daily totals
  const dailyUsage = usageHistory.reduce(
    (acc, event) => {
      const date = format(new Date(event.timestamp), "yyyy-MM-dd")
      if (!acc[date]) {
        acc[date] = {
          tokens: 0,
          messages: 0,
          threads: new Set(),
          models: {},
        }
      }

      acc[date].tokens += event.properties.totalTokens || 0
      acc[date].messages += 1
      if (event.properties.threadId) {
        acc[date].threads.add(event.properties.threadId)
      }

      const model = event.properties.model || "unknown"
      if (!acc[date].models[model]) {
        acc[date].models[model] = 0
      }
      acc[date].models[model] += event.properties.totalTokens || 0

      return acc
    },
    {} as Record<
      string,
      {
        tokens: number
        messages: number
        threads: Set<string>
        models: Record<string, number>
      }
    >,
  )

  const sortedDates = Object.keys(dailyUsage).sort().reverse()

  // Calculate trends
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { percent: 0, direction: "neutral" as const }
    const percent = ((current - previous) / previous) * 100
    return {
      percent: Math.abs(percent),
      direction: percent > 0 ? ("up" as const) : ("down" as const),
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Tokens (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(
                Object.values(dailyUsage).reduce(
                  (sum, day) => sum + day.tokens,
                  0,
                ),
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Messages Sent (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(
                Object.values(dailyUsage).reduce(
                  (sum, day) => sum + day.messages,
                  0,
                ),
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Threads (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                new Set(
                  Object.values(dailyUsage).flatMap((day) =>
                    Array.from(day.threads),
                  ),
                ).size
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Usage Breakdown</CardTitle>
          <CardDescription>
            Token consumption and activity by day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Usage data for the last 30 days</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Messages</TableHead>
                <TableHead className="text-right">Threads</TableHead>
                <TableHead>Top Model</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDates.map((date, index) => {
                const day = dailyUsage[date]
                const previousDay = dailyUsage[sortedDates[index + 1]]
                const tokenTrend = previousDay
                  ? calculateTrend(day.tokens, previousDay.tokens)
                  : null

                // Find top model for the day
                const topModel = Object.entries(day.models).sort(
                  ([, a], [, b]) => b - a,
                )[0]

                return (
                  <TableRow key={date}>
                    <TableCell>
                      {format(new Date(date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {formatNumber(day.tokens)}
                        {tokenTrend && tokenTrend.direction !== "neutral" && (
                          <span
                            className={`flex items-center text-xs ${
                              tokenTrend.direction === "up"
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {tokenTrend.direction === "up" ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {tokenTrend.percent.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{day.messages}</TableCell>
                    <TableCell className="text-right">
                      {day.threads.size}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {topModel ? topModel[0] : "-"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Model Usage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Model Usage</CardTitle>
          <CardDescription>Token consumption by AI model</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(
              Object.values(dailyUsage).reduce(
                (acc, day) => {
                  for (const [model, tokens] of Object.entries(day.models)) {
                    if (!acc[model]) acc[model] = 0
                    acc[model] += tokens
                  }
                  return acc
                },
                {} as Record<string, number>,
              ),
            )
              .sort(([, a], [, b]) => b - a)
              .map(([model, tokens]) => (
                <div key={model} className="flex justify-between items-center">
                  <span className="text-sm">{model}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatNumber(tokens)} tokens
                  </span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
