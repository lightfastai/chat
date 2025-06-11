import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  ...authTables,

  threads: defineTable({
    title: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
    lastMessageAt: v.number(),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    threadId: v.id("threads"),
    body: v.string(),
    timestamp: v.number(),
    messageType: v.union(v.literal("user"), v.literal("assistant")),
    isStreaming: v.optional(v.boolean()),
    streamId: v.optional(v.string()),
    isComplete: v.optional(v.boolean()),
  }).index("by_thread", ["threadId"]),
})
