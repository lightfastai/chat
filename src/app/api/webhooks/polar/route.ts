import { POLAR_CONFIG } from "@/lib/polar/client"
import { validateEvent } from "@polar-sh/sdk/webhooks"
import { fetchMutation } from "convex/nextjs"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { api } from "../../../../../convex/_generated/api"

/**
 * Polar webhook handler
 *
 * Processes webhook events from Polar.sh including:
 * - Subscription lifecycle events
 * - Checkout completions
 * - Payment updates
 * - Meter credit events
 */
export async function POST(request: Request) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get("webhook-signature") || ""
    const webhookId = headersList.get("webhook-id") || ""
    const webhookTimestamp = headersList.get("webhook-timestamp") || ""

    // Validate webhook signature
    let event: { type: string; timestamp?: string; data: unknown }
    try {
      event = validateEvent(
        body,
        {
          "webhook-signature": signature,
          "webhook-id": webhookId,
          "webhook-timestamp": webhookTimestamp,
        },
        POLAR_CONFIG.webhookSecret,
      )
    } catch (error) {
      console.error("Webhook validation error:", error)
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 403 },
      )
    }

    // Store webhook event for processing
    await fetchMutation(api.polar.webhooks.create, {
      webhookId,
      eventType: event.type,
      eventTimestamp: event.timestamp
        ? Date.parse(event.timestamp)
        : Date.now(),
      payload: event,
    })

    // Process specific event types
    switch (event.type) {
      case "checkout.completed": {
        // Handle new subscription creation
        const checkout = event.data
        console.log("Processing checkout completion:", checkout.id)

        // The actual processing will happen in Convex
        // This ensures idempotent processing and proper error handling
        await fetchMutation(api.polar.webhooks.processCheckoutCompleted, {
          webhookId,
        })
        break
      }

      case "subscription.created":
      case "subscription.updated": {
        // Handle subscription updates
        const subscription = event.data
        console.log(`Processing subscription ${event.type}:`, subscription.id)

        await fetchMutation(api.polar.webhooks.processSubscriptionUpdate, {
          webhookId,
        })
        break
      }

      case "subscription.canceled": {
        // Handle subscription cancellation
        const subscription = event.data
        console.log("Processing subscription cancellation:", subscription.id)

        await fetchMutation(api.polar.webhooks.processSubscriptionCanceled, {
          webhookId,
        })
        break
      }

      case "meter_credit.credited": {
        // Handle usage credits being added
        const credit = event.data
        console.log("Processing meter credit:", credit.id)

        await fetchMutation(api.polar.webhooks.processMeterCredit, {
          webhookId,
        })
        break
      }

      case "payment.failed": {
        // Handle failed payments
        const payment = event.data
        console.log("Processing failed payment:", payment.id)

        await fetchMutation(api.polar.webhooks.processPaymentFailed, {
          webhookId,
        })
        break
      }

      default: {
        console.log(`Unhandled webhook event type: ${event.type}`)
        // Still mark as processed to avoid redelivery
        await fetchMutation(api.polar.webhooks.markProcessed, {
          webhookId,
          status: "completed",
        })
      }
    }

    // Return success response
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error("Webhook processing error:", error)

    // Return error response
    // Polar will retry failed webhooks
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

// Polar sends POST requests only
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
