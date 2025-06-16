import { describe, expect, test } from "bun:test"

describe("Branch ID Collision Fix", () => {
  test("Branch IDs should be unique even with identical timestamps", () => {
    // Simulate the branch ID generation logic
    const generateBranchId = (messageId: string, timestamp: number) => {
      const randomSuffix = crypto.randomUUID().substring(0, 8)
      return `branch_${messageId}_${timestamp}_${randomSuffix}`
    }

    const messageId = "msg_test_123"
    const timestamp = Date.now()

    // Generate 1000 branch IDs with the same timestamp and message ID
    const branchIds = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      const branchId = generateBranchId(messageId, timestamp)
      branchIds.add(branchId)
    }

    // All 1000 should be unique
    expect(branchIds.size).toBe(1000)
  })

  test("Branch ID format should be correct", () => {
    const generateBranchId = (messageId: string, timestamp: number) => {
      const randomSuffix = crypto.randomUUID().substring(0, 8)
      return `branch_${messageId}_${timestamp}_${randomSuffix}`
    }

    const messageId = "msg_abc123"
    const timestamp = 1734567890123
    const branchId = generateBranchId(messageId, timestamp)

    // Should match pattern: branch_{messageId}_{timestamp}_{8-char-suffix}
    const pattern = /^branch_msg_abc123_1734567890123_[a-f0-9]{8}$/
    expect(branchId).toMatch(pattern)
  })

  test("Random suffix should be 8 characters", () => {
    const generateBranchId = (messageId: string, timestamp: number) => {
      const randomSuffix = crypto.randomUUID().substring(0, 8)
      return `branch_${messageId}_${timestamp}_${randomSuffix}`
    }

    const branchId = generateBranchId("msg_test", Date.now())
    const suffix = branchId.split('_').pop()
    
    expect(suffix).toBeDefined()
    expect(suffix!.length).toBe(8)
  })

  test("Branch IDs should contain original message ID and timestamp", () => {
    const generateBranchId = (messageId: string, timestamp: number) => {
      const randomSuffix = crypto.randomUUID().substring(0, 8)
      return `branch_${messageId}_${timestamp}_${randomSuffix}`
    }

    const messageId = "msg_original_456"
    const timestamp = 1234567890
    const branchId = generateBranchId(messageId, timestamp)

    expect(branchId).toContain(messageId)
    expect(branchId).toContain(timestamp.toString())
    expect(branchId).toStartWith("branch_")
  })
})