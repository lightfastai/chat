import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { auth } from "./auth"
import { handlePolarWebhook } from "./polar/webhooks"

const http = httpRouter()

auth.addHttpRoutes(http)

// Polar webhook endpoint
http.route({
  path: "/polar/webhook",
  method: "POST",
  handler: handlePolarWebhook,
})

// Health check endpoint
http.route({
  path: "/health",
  method: "GET", 
  handler: httpAction(async () => {
    return new Response("OK", { status: 200 })
  }),
})

export default http
