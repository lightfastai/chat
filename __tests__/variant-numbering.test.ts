import { describe, expect, test } from "bun:test"

describe("Variant Numbering Bug", () => {
  test("should maintain correct variant numbering for different messages", () => {
    // Simulate the bug scenario from screenshots
    const messages = [
      // First "hey" and response
      { _id: "user1", body: "hey", messageType: "user", branchSequence: 0 },
      {
        _id: "ai1",
        body: "Hello!",
        messageType: "assistant",
        branchSequence: 0,
      },

      // First retry of ai1 (should be 2/2)
      {
        _id: "ai1_v1",
        body: "Hi there!",
        messageType: "assistant",
        branchSequence: 1,
        branchFromMessageId: "ai1",
      },

      // Second retry of ai1 (should be 3/3, but showing as 1/2)
      {
        _id: "ai1_v2",
        body: "Hey!",
        messageType: "assistant",
        branchSequence: 2,
        branchFromMessageId: "ai1",
      },

      // Second "hey" and response
      { _id: "user2", body: "hey", messageType: "user", branchSequence: 0 },
      {
        _id: "ai2",
        body: "Hello again!",
        messageType: "assistant",
        branchSequence: 0,
      },

      // Retry of ai2 (should be 2/2, but showing as 3/3)
      {
        _id: "ai2_v1",
        body: "Hi again!",
        messageType: "assistant",
        branchSequence: 1,
        branchFromMessageId: "ai2",
      },
    ]

    // Group by original message
    const variantGroups = new Map<string, typeof messages>()

    for (const msg of messages) {
      const key = msg.branchFromMessageId || msg._id
      if (!variantGroups.has(key)) {
        variantGroups.set(key, [])
      }
      variantGroups.get(key)!.push(msg)
    }

    // Check ai1 variants
    const ai1Variants = variantGroups.get("ai1")!
    expect(ai1Variants).toHaveLength(3) // Original + 2 variants
    expect(ai1Variants[0].branchSequence).toBe(0)
    expect(ai1Variants[1].branchSequence).toBe(1)
    expect(ai1Variants[2].branchSequence).toBe(2)

    // Check ai2 variants
    const ai2Variants = variantGroups.get("ai2")!
    expect(ai2Variants).toHaveLength(2) // Original + 1 variant
    expect(ai2Variants[0].branchSequence).toBe(0)
    expect(ai2Variants[1].branchSequence).toBe(1)

    // Verify they're separate groups
    expect(ai1Variants).not.toBe(ai2Variants)

    console.log("AI1 variants:", ai1Variants.length)
    console.log("AI2 variants:", ai2Variants.length)
  })

  test("messageVariants map should track variants per original message", () => {
    // This simulates what should happen in ChatInterface
    const messages = [
      { _id: "ai1", branchSequence: 0 },
      { _id: "ai1_v1", branchSequence: 1, branchFromMessageId: "ai1" },
      { _id: "ai1_v2", branchSequence: 2, branchFromMessageId: "ai1" },
      { _id: "ai2", branchSequence: 0 },
      { _id: "ai2_v1", branchSequence: 1, branchFromMessageId: "ai2" },
    ]

    const messageVariants = new Map()
    const messageGroups = new Map()

    // Build groups
    for (const msg of messages) {
      const originalId = msg.branchFromMessageId || msg._id
      if (!messageGroups.has(originalId)) {
        messageGroups.set(originalId, [])
      }
      messageGroups.get(originalId).push(msg)
    }

    // Create variant info
    for (const [originalId, variants] of messageGroups) {
      if (variants.length > 1) {
        messageVariants.set(originalId, {
          variants,
          selected: variants.length - 1, // Select latest
          total: variants.length,
        })
      }
    }

    // Check variant info
    const ai1Info = messageVariants.get("ai1")
    expect(ai1Info.total).toBe(3)
    expect(ai1Info.selected).toBe(2)

    const ai2Info = messageVariants.get("ai2")
    expect(ai2Info.total).toBe(2)
    expect(ai2Info.selected).toBe(1)

    console.log("AI1 variant info:", ai1Info)
    console.log("AI2 variant info:", ai2Info)
  })
})
