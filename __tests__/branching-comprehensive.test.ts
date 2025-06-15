import { beforeEach, describe, expect, test } from "bun:test"

// Mock message structure
interface MockMessage {
  _id: string
  threadId: string
  body: string
  messageType: "user" | "assistant"
  timestamp: number
  branchId?: string
  branchSequence?: number
  branchFromMessageId?: string
  conversationBranchId?: string
  branchPoint?: string
  parentMessageId?: string
}

// Mock conversation state with detailed logging
class MockConversation {
  messages: MockMessage[] = []
  nextId = 1
  logs: string[] = []

  log(message: string) {
    this.logs.push(message)
    console.log(`[LOG] ${message}`)
  }

  addMessage(
    body: string,
    type: "user" | "assistant",
    options: Partial<MockMessage> = {},
  ): MockMessage {
    const message: MockMessage = {
      _id: `msg_${this.nextId++}`,
      threadId: "thread_1",
      body,
      messageType: type,
      timestamp: Date.now(),
      branchId: "main",
      branchSequence: 0,
      conversationBranchId: "main",
      ...options,
    }
    this.messages.push(message)
    this.log(`Added ${type} message: ${message._id} - "${body}"`)
    return message
  }

  // Find the root original message (handles retry of retry)
  findRootOriginal(messageId: string): MockMessage {
    const message = this.messages.find((m) => m._id === messageId)
    if (!message) throw new Error("Message not found")

    if (message.branchFromMessageId) {
      this.log(`Tracing ${messageId} back to ${message.branchFromMessageId}`)
      return this.findRootOriginal(message.branchFromMessageId)
    }

    this.log(`Found root original: ${messageId}`)
    return message
  }

  // Simulate retry logic
  createRetry(clickedMessageId: string): MockMessage {
    this.log(`\n=== RETRY CLICKED ON: ${clickedMessageId} ===`)

    const clickedMessage = this.messages.find((m) => m._id === clickedMessageId)
    if (!clickedMessage) throw new Error("Clicked message not found")

    // CRITICAL FIX: Always find the root original message
    const rootOriginal = this.findRootOriginal(clickedMessageId)

    // Find existing branches of the ROOT ORIGINAL message
    const existingBranches = this.messages.filter(
      (m) => m.branchFromMessageId === rootOriginal._id,
    )

    this.log(`Root original: ${rootOriginal._id}`)
    this.log(`Existing branches: ${existingBranches.length}`)

    // Check limit (max 9 branches + 1 original = 10 total)
    if (existingBranches.length >= 9) {
      throw new Error("Maximum number of branches (10) reached")
    }

    const newBranchSequence = existingBranches.length + 1
    const branchId = `b${newBranchSequence}`

    // CONVERSATION BRANCH LOGIC:
    const conversationBranchId =
      clickedMessage.conversationBranchId !== "main"
        ? clickedMessage.conversationBranchId // Stay in existing branch
        : `branch_${rootOriginal._id}_${Date.now()}_${newBranchSequence}` // Create new branch with unique ID

    this.log(`New branch sequence: ${newBranchSequence}`)
    this.log(`Conversation branch: ${conversationBranchId}`)

    const retryMessage: MockMessage = {
      _id: `msg_${this.nextId++}`,
      threadId: rootOriginal.threadId,
      body: `Retry ${newBranchSequence} of: ${rootOriginal.body}`,
      messageType: "assistant",
      timestamp: Date.now(),
      branchId,
      branchSequence: newBranchSequence,
      branchFromMessageId: rootOriginal._id, // ALWAYS point to root original
      conversationBranchId,
      branchPoint: rootOriginal._id,
      parentMessageId: rootOriginal.parentMessageId,
    }

    this.messages.push(retryMessage)
    this.log(
      `Created retry: ${retryMessage._id} (variant ${newBranchSequence} of ${rootOriginal._id})`,
    )
    return retryMessage
  }

  // Get all variants of a message
  getVariants(originalMessageId: string): MockMessage[] {
    const original = this.messages.find((m) => m._id === originalMessageId)
    const variants = this.messages.filter(
      (m) => m.branchFromMessageId === originalMessageId,
    )

    return original
      ? [original, ...variants].sort(
          (a, b) => (a.branchSequence || 0) - (b.branchSequence || 0),
        )
      : []
  }

  // Get messages in a conversation branch
  getMessagesInBranch(conversationBranchId: string): MockMessage[] {
    return this.messages
      .filter((m) => m.conversationBranchId === conversationBranchId)
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  // Get all conversation branches
  getConversationBranches(): string[] {
    const branches = new Set<string>()
    for (const m of this.messages) {
      if (m.conversationBranchId) {
        branches.add(m.conversationBranchId)
      }
    }
    return Array.from(branches)
  }

  // Visualize the conversation tree
  visualizeTree(): string {
    const branches = this.getConversationBranches()
    let output = "\n=== CONVERSATION TREE ===\n"

    for (const branch of branches) {
      output += `\nBranch: ${branch}\n`
      const messages = this.getMessagesInBranch(branch)
      for (const msg of messages) {
        const indent = msg.branchFromMessageId ? "  └─ " : "• "
        output += `${indent}${msg._id}: ${msg.body}\n`
        if (msg.branchFromMessageId) {
          output += `     (variant ${msg.branchSequence} of ${msg.branchFromMessageId})\n`
        }
      }
    }

    return output
  }

  reset() {
    this.messages = []
    this.nextId = 1
    this.logs = []
  }
}

describe("Comprehensive Branching Tests", () => {
  let conversation: MockConversation

  beforeEach(() => {
    conversation = new MockConversation()
  })

  describe("Complex Retry Scenarios", () => {
    test("should handle 5 consecutive retries correctly", () => {
      const user = conversation.addMessage("Tell me a story", "user")
      const ai1 = conversation.addMessage("Once upon a time...", "assistant")

      // Create 5 retries
      const retries: MockMessage[] = []
      for (let i = 0; i < 5; i++) {
        const lastMessage = i === 0 ? ai1 : retries[i - 1]
        retries.push(conversation.createRetry(lastMessage._id))
      }

      // All retries should be variants of the original
      retries.forEach((retry, index) => {
        expect(retry.branchFromMessageId).toBe(ai1._id)
        expect(retry.branchSequence).toBe(index + 1)
      })

      // All retries should be in the same conversation branch
      const convBranch = retries[0].conversationBranchId
      for (const retry of retries) {
        expect(retry.conversationBranchId).toBe(convBranch)
      }

      console.log(conversation.visualizeTree())
    })

    test("should handle branching at different points in conversation", () => {
      // Build a conversation
      const user1 = conversation.addMessage("Hello", "user")
      const ai1 = conversation.addMessage("Hi there!", "assistant")
      const user2 = conversation.addMessage("Tell me about AI", "user")
      const ai2 = conversation.addMessage("AI is fascinating...", "assistant")
      const user3 = conversation.addMessage("What about ML?", "user")
      const ai3 = conversation.addMessage("ML is a subset...", "assistant")

      // Branch from different points
      const ai1_retry = conversation.createRetry(ai1._id)
      const ai2_retry = conversation.createRetry(ai2._id)
      const ai3_retry = conversation.createRetry(ai3._id)

      // Each should create its own conversation branch
      expect(ai1_retry.conversationBranchId).not.toBe("main")
      expect(ai2_retry.conversationBranchId).not.toBe("main")
      expect(ai3_retry.conversationBranchId).not.toBe("main")

      // They should all be in different branches
      expect(ai1_retry.conversationBranchId).not.toBe(
        ai2_retry.conversationBranchId,
      )
      expect(ai2_retry.conversationBranchId).not.toBe(
        ai3_retry.conversationBranchId,
      )

      console.log(conversation.visualizeTree())
    })

    test("should handle complex nested retry pattern", () => {
      // User -> AI1 -> Retry1 -> Retry2 -> User2 -> AI2 -> Retry3
      const user1 = conversation.addMessage("Question 1", "user")
      const ai1 = conversation.addMessage("Answer 1", "assistant")

      // First retry of AI1
      const ai1_retry1 = conversation.createRetry(ai1._id)
      expect(ai1_retry1.branchSequence).toBe(1)

      // Second retry (clicking on retry1)
      const ai1_retry2 = conversation.createRetry(ai1_retry1._id)
      expect(ai1_retry2.branchFromMessageId).toBe(ai1._id) // Should point to original!
      expect(ai1_retry2.branchSequence).toBe(2)
      expect(ai1_retry2.conversationBranchId).toBe(
        ai1_retry1.conversationBranchId,
      )

      // Continue conversation in branch
      const user2 = conversation.addMessage("Follow up question", "user", {
        conversationBranchId: ai1_retry2.conversationBranchId,
        parentMessageId: ai1_retry2._id,
      })

      const ai2 = conversation.addMessage("Follow up answer", "assistant", {
        conversationBranchId: ai1_retry2.conversationBranchId,
        parentMessageId: user2._id,
      })

      // Retry the follow-up answer
      const ai2_retry = conversation.createRetry(ai2._id)
      expect(ai2_retry.branchFromMessageId).toBe(ai2._id) // New original
      expect(ai2_retry.branchSequence).toBe(1) // First retry of ai2
      expect(ai2_retry.conversationBranchId).toBe(ai2.conversationBranchId) // Stay in branch

      console.log(conversation.visualizeTree())
    })

    test("should handle parallel branches correctly", () => {
      const user = conversation.addMessage("Tell me about space", "user")
      const ai = conversation.addMessage("Space is vast...", "assistant")

      // Create 3 parallel branches from the same message
      const branch1 = conversation.createRetry(ai._id)
      const branch2 = conversation.createRetry(ai._id)
      const branch3 = conversation.createRetry(ai._id)

      // All should be variants of the original
      expect(branch1.branchFromMessageId).toBe(ai._id)
      expect(branch2.branchFromMessageId).toBe(ai._id)
      expect(branch3.branchFromMessageId).toBe(ai._id)

      // Should have sequential branch numbers
      expect(branch1.branchSequence).toBe(1)
      expect(branch2.branchSequence).toBe(2)
      expect(branch3.branchSequence).toBe(3)

      // Continue in branch 2
      const user2 = conversation.addMessage("More details?", "user", {
        conversationBranchId: branch2.conversationBranchId,
        parentMessageId: branch2._id,
      })

      const ai2 = conversation.addMessage("Sure, here's more...", "assistant", {
        conversationBranchId: branch2.conversationBranchId,
        parentMessageId: user2._id,
      })

      // Retry within branch 2
      const ai2_retry = conversation.createRetry(ai2._id)
      expect(ai2_retry.conversationBranchId).toBe(branch2.conversationBranchId)

      console.log(conversation.visualizeTree())
    })

    test("should handle diamond pattern correctly", () => {
      // Create a diamond: original -> 2 branches -> both merge back
      const user1 = conversation.addMessage("Start", "user")
      const ai1 = conversation.addMessage("Response", "assistant")

      // Two branches
      const branch1 = conversation.createRetry(ai1._id)
      const branch2 = conversation.createRetry(ai1._id)

      // Continue both branches
      const user2_b1 = conversation.addMessage("Path 1", "user", {
        conversationBranchId: branch1.conversationBranchId,
        parentMessageId: branch1._id,
      })

      const user2_b2 = conversation.addMessage("Path 2", "user", {
        conversationBranchId: branch2.conversationBranchId,
        parentMessageId: branch2._id,
      })

      // This creates independent conversation paths
      expect(user2_b1.conversationBranchId).not.toBe(
        user2_b2.conversationBranchId,
      )

      console.log(conversation.visualizeTree())
    })

    test("should enforce retry limit correctly", () => {
      const user = conversation.addMessage("Test", "user")
      const ai = conversation.addMessage("Response", "assistant")

      // Create 9 retries (max allowed)
      const retries: MockMessage[] = []
      for (let i = 0; i < 9; i++) {
        retries.push(conversation.createRetry(ai._id))
      }

      // 10th retry should fail
      expect(() => conversation.createRetry(ai._id)).toThrow(
        "Maximum number of branches",
      )

      // But we can still retry other messages
      const user2 = conversation.addMessage("Another question", "user")
      const ai2 = conversation.addMessage("Another answer", "assistant")
      const ai2_retry = conversation.createRetry(ai2._id)
      expect(ai2_retry).toBeDefined()
    })

    test("should handle mixed retry patterns", () => {
      // Complex scenario: retry original, then retry a different message, then retry first retry
      const user1 = conversation.addMessage("Q1", "user")
      const ai1 = conversation.addMessage("A1", "assistant")
      const user2 = conversation.addMessage("Q2", "user")
      const ai2 = conversation.addMessage("A2", "assistant")

      // Retry first AI
      const ai1_r1 = conversation.createRetry(ai1._id)
      const branch1 = ai1_r1.conversationBranchId

      // Continue in branch 1
      const user3_b1 = conversation.addMessage("Q3 in branch", "user", {
        conversationBranchId: branch1,
        parentMessageId: ai1_r1._id,
      })
      const ai3_b1 = conversation.addMessage("A3 in branch", "assistant", {
        conversationBranchId: branch1,
        parentMessageId: user3_b1._id,
      })

      // Now retry the first retry (should create variant 2 of original)
      const ai1_r2 = conversation.createRetry(ai1_r1._id)
      expect(ai1_r2.branchFromMessageId).toBe(ai1._id)
      expect(ai1_r2.branchSequence).toBe(2)
      expect(ai1_r2.conversationBranchId).toBe(branch1) // Stay in same branch

      // Retry ai3 in branch
      const ai3_r1 = conversation.createRetry(ai3_b1._id)
      expect(ai3_r1.conversationBranchId).toBe(branch1) // Stay in same branch
      expect(ai3_r1.branchFromMessageId).toBe(ai3_b1._id) // New root for this retry

      console.log(conversation.visualizeTree())
    })
  })

  describe("Edge Case Stress Tests", () => {
    test("should handle rapid consecutive retries", () => {
      const user = conversation.addMessage("Test", "user")
      const ai = conversation.addMessage("Response", "assistant")

      // Simulate rapid clicking - create 5 retries quickly
      const retries = []
      for (let i = 0; i < 5; i++) {
        // Always retry the original, simulating UI not updating fast enough
        retries.push(conversation.createRetry(ai._id))
      }

      // All should be valid variants
      retries.forEach((retry, index) => {
        expect(retry.branchSequence).toBe(index + 1)
        expect(retry.branchFromMessageId).toBe(ai._id)
      })
    })

    test("should handle deeply nested conversation branches", () => {
      // Create a deep conversation tree
      let lastMessage = conversation.addMessage("Start", "user")

      for (let i = 0; i < 10; i++) {
        const ai = conversation.addMessage(`Level ${i}`, "assistant", {
          parentMessageId: lastMessage._id,
          conversationBranchId: lastMessage.conversationBranchId,
        })

        // Every 3rd message, create a retry
        if (i % 3 === 0) {
          const retry = conversation.createRetry(ai._id)
          lastMessage = retry
        } else {
          lastMessage = conversation.addMessage(`Question ${i}`, "user", {
            parentMessageId: ai._id,
            conversationBranchId: ai.conversationBranchId,
          })
        }
      }

      // Should have created multiple conversation branches
      const branches = conversation.getConversationBranches()
      expect(branches.length).toBeGreaterThan(1)

      console.log(`Created ${branches.length} conversation branches`)
      console.log(conversation.visualizeTree())
    })

    test("should maintain conversation integrity with interleaved retries", () => {
      // User1 -> AI1 -> User2 -> AI2 -> Retry AI1 -> Continue from retry
      const user1 = conversation.addMessage("First question", "user")
      const ai1 = conversation.addMessage("First answer", "assistant")
      const user2 = conversation.addMessage("Second question", "user")
      const ai2 = conversation.addMessage("Second answer", "assistant")

      // Now go back and retry AI1
      const ai1_retry = conversation.createRetry(ai1._id)

      // The retry should be in a new branch
      expect(ai1_retry.conversationBranchId).not.toBe("main")

      // Continue from the retry
      const user3 = conversation.addMessage("Third question", "user", {
        conversationBranchId: ai1_retry.conversationBranchId,
        parentMessageId: ai1_retry._id,
      })

      // This should be in the retry's branch, not main
      expect(user3.conversationBranchId).toBe(ai1_retry.conversationBranchId)

      // Original conversation in main should be unaffected
      const mainMessages = conversation.getMessagesInBranch("main")
      expect(mainMessages).toHaveLength(4) // user1, ai1, user2, ai2

      console.log(conversation.visualizeTree())
    })
  })

  describe("Real-World Scenarios", () => {
    test("should handle typical user retry pattern", () => {
      // User tries different phrasings of a question
      const user1 = conversation.addMessage("Explain quantum computing", "user")
      const ai1 = conversation.addMessage(
        "Quantum computing uses qubits...",
        "assistant",
      )

      // User not satisfied, retries
      const ai1_r1 = conversation.createRetry(ai1._id)

      // Still not satisfied, retries again
      const ai1_r2 = conversation.createRetry(ai1_r1._id)

      // Happy with this one, continues conversation
      const user2 = conversation.addMessage(
        "What about superposition?",
        "user",
        {
          conversationBranchId: ai1_r2.conversationBranchId,
          parentMessageId: ai1_r2._id,
        },
      )
      const ai2 = conversation.addMessage(
        "Superposition allows...",
        "assistant",
        {
          conversationBranchId: ai1_r2.conversationBranchId,
          parentMessageId: user2._id,
        },
      )

      // Wants to try different explanation of superposition
      const ai2_r1 = conversation.createRetry(ai2._id)

      // Verify structure
      expect(ai1_r2.branchFromMessageId).toBe(ai1._id)
      expect(ai1_r2.branchSequence).toBe(2)
      expect(ai2_r1.conversationBranchId).toBe(ai1_r2.conversationBranchId)

      console.log(conversation.visualizeTree())
    })

    test("should handle editing and branching workflow", () => {
      // Simulate user editing their messages and AI retrying
      const user1 = conversation.addMessage("Write a python function", "user")
      const ai1 = conversation.addMessage(
        "def hello():\n  print('Hello')",
        "assistant",
      )

      // User wants more complex function
      const user1_edit = conversation.addMessage(
        "Write a fibonacci function",
        "user",
        {
          branchFromMessageId: user1._id,
          branchSequence: 1,
          conversationBranchId: "branch_edit_1",
        },
      )

      const ai1_edit = conversation.addMessage(
        "def fibonacci(n):\n  ...",
        "assistant",
        {
          conversationBranchId: user1_edit.conversationBranchId,
          parentMessageId: user1_edit._id,
        },
      )

      // Retry the fibonacci implementation
      const ai1_edit_r1 = conversation.createRetry(ai1_edit._id)
      expect(ai1_edit_r1.conversationBranchId).toBe(
        user1_edit.conversationBranchId,
      )

      console.log(conversation.visualizeTree())
    })
  })

  describe("Bug Reproduction Tests", () => {
    test("CRITICAL: should not create new conversation branch on second retry", () => {
      const user = conversation.addMessage("Hello", "user")
      const ai1 = conversation.addMessage("Hi!", "assistant")

      // First retry - creates new conversation branch
      const ai2 = conversation.createRetry(ai1._id)
      const firstBranch = ai2.conversationBranchId
      expect(firstBranch).not.toBe("main")

      // Second retry - should STAY in same conversation branch
      const ai3 = conversation.createRetry(ai2._id)
      expect(ai3.conversationBranchId).toBe(firstBranch) // CRITICAL ASSERTION

      // Third retry - should still be in same branch
      const ai4 = conversation.createRetry(ai3._id)
      expect(ai4.conversationBranchId).toBe(firstBranch)

      // All should be variants of original
      expect(ai2.branchFromMessageId).toBe(ai1._id)
      expect(ai3.branchFromMessageId).toBe(ai1._id)
      expect(ai4.branchFromMessageId).toBe(ai1._id)

      console.log(conversation.visualizeTree())
    })

    test("should handle branch navigation state correctly", () => {
      const user = conversation.addMessage("Test", "user")
      const ai = conversation.addMessage("Response", "assistant")

      // Create multiple branches
      const branches = []
      for (let i = 0; i < 5; i++) {
        branches.push(conversation.createRetry(ai._id))
      }

      // Each branch should have correct sequence
      branches.forEach((branch, index) => {
        expect(branch.branchSequence).toBe(index + 1)
      })

      // All variants including original
      const allVariants = conversation.getVariants(ai._id)
      expect(allVariants).toHaveLength(6) // original + 5 retries
    })
  })
})
