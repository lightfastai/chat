import { describe, expect, test } from "bun:test"

// Simplified test to isolate the bug
describe("Bug Analysis", () => {
  test("CRITICAL BUG: Retrying different messages creates same conversation branch", () => {
    console.log("\n=== BUG REPRODUCTION ===")

    // Mock the current backend logic
    interface MockMessage {
      _id: string
      conversationBranchId: string
    }

    const simulateCurrentLogic = (
      originalMessage: MockMessage,
      clickedMessage: MockMessage,
    ) => {
      // Current logic from createAssistantMessageBranch
      const conversationBranchId =
        originalMessage.conversationBranchId &&
        originalMessage.conversationBranchId !== "main"
          ? originalMessage.conversationBranchId // Stay in existing branch
          : `branch_${Date.now()}_${1}` // Create new branch

      return conversationBranchId
    }

    // Scenario 1: First retry from main
    const ai1 = { _id: "ai1", conversationBranchId: "main" }
    const branch1 = simulateCurrentLogic(ai1, ai1)
    console.log(`Retry AI1 from main: ${branch1}`)

    // Scenario 2: Second retry from main (different message)
    const ai2 = { _id: "ai2", conversationBranchId: "main" }
    const branch2 = simulateCurrentLogic(ai2, ai2)
    console.log(`Retry AI2 from main: ${branch2}`)

    // BUG: They get the same timestamp-based branch ID!
    console.log(
      "\nPROBLEM: Both retries might get same branch ID if done quickly",
    )
    console.log("This happens because Date.now() might return same value")

    // The fix should be:
    const simulateFixedLogic = (
      originalMessage: MockMessage,
      clickedMessage: MockMessage,
      existingBranches: number,
    ) => {
      // If original is already in a branch AND clicked message is in same branch, stay there
      if (
        clickedMessage.conversationBranchId &&
        clickedMessage.conversationBranchId !== "main" &&
        clickedMessage.conversationBranchId ===
          originalMessage.conversationBranchId
      ) {
        return clickedMessage.conversationBranchId
      }

      // Otherwise create a new unique branch
      const uniqueId = `${originalMessage._id}_${Date.now()}_${existingBranches + 1}`
      return `branch_${uniqueId}`
    }

    console.log("\n=== FIXED LOGIC ===")
    const fixedBranch1 = simulateFixedLogic(ai1, ai1, 0)
    const fixedBranch2 = simulateFixedLogic(ai2, ai2, 0)
    console.log(`Retry AI1: ${fixedBranch1}`)
    console.log(`Retry AI2: ${fixedBranch2}`)

    expect(fixedBranch1).not.toBe(fixedBranch2)
  })

  test("Analyze conversation branch creation logic", () => {
    // The current logic has flaws:
    // 1. Uses only Date.now() which can be same for rapid retries
    // 2. Doesn't include message ID for uniqueness
    // 3. The branchSequence is per-message, not global

    const messages = [
      { _id: "msg1", conversationBranchId: "main" },
      { _id: "msg2", conversationBranchId: "main" },
      { _id: "msg3", conversationBranchId: "main" },
    ]

    // Simulate rapid retries
    const branches = messages.map((msg) => {
      return `branch_${Date.now()}_1`
    })

    // They might all be the same!
    console.log("Branches created:", branches)
    console.log("Unique branches:", new Set(branches).size)

    // This explains why different messages get same conversation branch
  })

  test("Deep dive into retry logic", () => {
    // Let's trace through what happens:

    // 1. User has conversation: User1 -> AI1 -> User2 -> AI2
    // 2. User retries AI1
    //    - Creates branch_12345_1
    //    - AI1 retry goes into this branch
    // 3. User retries AI2
    //    - SHOULD create branch_67890_1
    //    - BUT if done quickly, might get branch_12345_1 (same timestamp!)

    const trace = {
      step1: "Original conversation in main",
      step2: "Retry AI1 -> creates branch_12345_1",
      step3:
        "Retry AI2 -> SHOULD create new branch but might reuse branch_12345_1",
      problem: "Conversation branches get mixed up",
    }

    console.log("Trace:", trace)
  })
})
