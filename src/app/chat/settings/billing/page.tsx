import { SettingsNavigation } from "@/components/settings/SettingsNavigation"
import { SubscriptionStatus } from "@/components/subscription/SubscriptionStatus"
import { UsageHistory } from "@/components/subscription/UsageHistory"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function BillingSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-8">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <SettingsNavigation activeTab="billing" />

      <div className="mt-6 space-y-6">
        <Tabs defaultValue="subscription" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="usage">Usage History</TabsTrigger>
          </TabsList>

          <TabsContent value="subscription" className="space-y-6">
            <SubscriptionStatus />

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>
                  Manage your payment methods and billing information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Payment methods are managed through Polar. Click "Manage
                  Subscription" above to update your payment information.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <UsageHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
