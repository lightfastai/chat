import { describe, test, expect, beforeEach } from "bun:test"

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

// Mock conversation state
class MockConversation {
  messages: MockMessage[] = []
  nextId = 1

  addMessage(
    body: string, 
    type: "user" | "assistant", 
    options: Partial<MockMessage> = {}
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
      ...options
    }
    this.messages.push(message)
    return message
  }

  // Find the root original message (handles retry of retry)
  findRootOriginal(messageId: string): MockMessage {
    const message = this.messages.find(m => m._id === messageId)
    if (!message) throw new Error("Message not found")
    
    // If this message has a branchFromMessageId, it's a variant
    // Keep tracing back to find the root original
    if (message.branchFromMessageId) {
      return this.findRootOriginal(message.branchFromMessageId)
    }
    
    return message
  }

  // Simulate CORRECTED retry logic
  createRetry(clickedMessageId: string): MockMessage {
    const clickedMessage = this.messages.find(m => m._id === clickedMessageId)
    if (!clickedMessage) throw new Error("Clicked message not found")

    // CRITICAL FIX: Always find the root original message
    const rootOriginal = this.findRootOriginal(clickedMessageId)
    
    // Find existing branches of the ROOT ORIGINAL message
    const existingBranches = this.messages.filter(m => 
      m.branchFromMessageId === rootOriginal._id
    )

    // Check limit (max 9 branches + 1 original = 10 total)
    if (existingBranches.length >= 9) {
      throw new Error("Maximum number of branches (10) reached")
    }

    const newBranchSequence = existingBranches.length + 1
    const branchId = `b${newBranchSequence}`

    // CONVERSATION BRANCH LOGIC:
    // If clicked message is already in a branch, stay in that branch
    // Otherwise, create new branch for first retry from main
    const conversationBranchId = clickedMessage.conversationBranchId !== "main"
      ? clickedMessage.conversationBranchId  // Stay in existing branch
      : `branch_${Date.now()}_${newBranchSequence}`  // Create new branch

    const retryMessage: MockMessage = {
      _id: `msg_${this.nextId++}`,
      threadId: rootOriginal.threadId,
      body: `Retry ${newBranchSequence} of: ${rootOriginal.body}`,
      messageType: "assistant",
      timestamp: Date.now(),
      branchId,
      branchSequence: newBranchSequence,
      branchFromMessageId: rootOriginal._id,  // ALWAYS point to root original
      conversationBranchId,
      branchPoint: rootOriginal._id,
      parentMessageId: rootOriginal.parentMessageId
    }

    this.messages.push(retryMessage)
    return retryMessage
  }

  getMessagesInBranch(conversationBranchId: string): MockMessage[] {
    return this.messages.filter(m => 
      m.conversationBranchId === conversationBranchId
    ).sort((a, b) => a.timestamp - b.timestamp)
  }

  getVariants(originalMessageId: string): MockMessage[] {
    const original = this.messages.find(m => m._id === originalMessageId)
    const variants = this.messages.filter(m => 
      m.branchFromMessageId === originalMessageId
    )
    
    return original ? [original, ...variants].sort((a, b) => 
      (a.branchSequence || 0) - (b.branchSequence || 0)
    ) : []
  }

  reset() {
    this.messages = []
    this.nextId = 1
  }
}

describe("Branching Logic Tests", () => {
  let conversation: MockConversation

  beforeEach(() => {
    conversation = new MockConversation()
  })

  describe("Basic Retry Functionality", () => {
    test("should create first retry correctly", () => {
      // Setup: User message -> Assistant response
      const userMsg = conversation.addMessage("Hello", "user")
      const assistantMsg1 = conversation.addMessage("Hi there!", "assistant", {
        parentMessageId: userMsg._id
      })

      // Action: Retry the assistant message
      const assistantMsg2 = conversation.createRetry(assistantMsg1._id)

      // Assertions
      expect(assistantMsg2.branchFromMessageId).toBe(assistantMsg1._id)
      expect(assistantMsg2.branchSequence).toBe(1)
      expect(assistantMsg2.branchId).toBe("b1")
      expect(assistantMsg2.conversationBranchId).not.toBe("main")
      expect(assistantMsg2.conversationBranchId).toContain("branch_")
      
      console.log("✓ First retry test passed")
    })

    test("should handle second retry correctly", () => {
      // Setup: User message -> Assistant response -> First retry
      const userMsg = conversation.addMessage("Hello", "user")
      const assistantMsg1 = conversation.addMessage("Hi there!", "assistant", {
        parentMessageId: userMsg._id
      })
      const assistantMsg2 = conversation.createRetry(assistantMsg1._id)

      // Action: Retry the second assistant message
      const assistantMsg3 = conversation.createRetry(assistantMsg2._id)

      // Assertions: Should create variant of ORIGINAL message, not the retry
      expect(assistantMsg3.branchFromMessageId).toBe(assistantMsg1._id) // Should be original!
      expect(assistantMsg3.branchSequence).toBe(2)
      expect(assistantMsg3.branchId).toBe("b2")
      
      // Critical: Should stay in same conversation branch
      expect(assistantMsg3.conversationBranchId).toBe(assistantMsg2.conversationBranchId)

      console.log("✓ Second retry test passed")
    })
  })

  describe("Conversation Flow Preservation", () => {
    test("should maintain conversation context across retries", () => {
      // Setup complex conversation
      const userMsg1 = conversation.addMessage("What's 2+2?", "user")
      const assistantMsg1 = conversation.addMessage("2+2 equals 4", "assistant", {
        parentMessageId: userMsg1._id
      })
      
      const userMsg2 = conversation.addMessage("What about 3+3?", "user", {
        parentMessageId: assistantMsg1._id
      })
      const assistantMsg2 = conversation.addMessage("3+3 equals 6", "assistant", {
        parentMessageId: userMsg2._id
      })

      // Action: Retry the second assistant message
      const assistantMsg2Retry = conversation.createRetry(assistantMsg2._id)

      // The retry should be in a new conversation branch
      const branchMessages = conversation.getMessagesInBranch(assistantMsg2Retry.conversationBranchId!)
      
      // Should include the conversation context leading up to the retry
      expect(branchMessages.length).toBeGreaterThan(1)
      expect(branchMessages.some(m => m.body.includes("2+2"))).toBe(true)
      expect(branchMessages.some(m => m.body.includes("3+3"))).toBe(true)

      console.log("✓ Conversation context test passed")
    })

    test("should handle nested retries in same conversation branch", () => {
      // Setup
      const userMsg = conversation.addMessage("Tell me a joke", "user")
      const assistantMsg1 = conversation.addMessage("Why did the chicken cross the road?", "assistant")
      
      // First retry
      const assistantMsg2 = conversation.createRetry(assistantMsg1._id)
      const branchId1 = assistantMsg2.conversationBranchId!
      
      // Second retry - should stay in same conversation branch
      const assistantMsg3 = conversation.createRetry(assistantMsg2._id)
      const branchId2 = assistantMsg3.conversationBranchId!
      
      // Critical assertion: Should be in same conversation branch
      expect(branchId2).toBe(branchId1)
      
      // All variants should be of the original message
      const variants = conversation.getVariants(assistantMsg1._id)
      expect(variants).toHaveLength(3) // Original + 2 retries
      expect(variants[0]._id).toBe(assistantMsg1._id)
      expect(variants[1]._id).toBe(assistantMsg2._id)
      expect(variants[2]._id).toBe(assistantMsg3._id)

      console.log("✓ Nested retries test passed")
    })
  })

  describe("Edge Cases", () => {
    test("should handle retry of retry correctly", () => {
      const userMsg = conversation.addMessage("Hello", "user")
      const original = conversation.addMessage("Original response", "assistant")
      const retry1 = conversation.createRetry(original._id)
      
      // This is the problematic case: retry of a retry
      const retry2 = conversation.createRetry(retry1._id)
      
      // Should create variant of ORIGINAL, not the retry
      expect(retry2.branchFromMessageId).toBe(original._id)
      expect(retry2.conversationBranchId).toBe(retry1.conversationBranchId)
      
      console.log("✓ Retry of retry test passed")
    })

    test("should limit maximum retries", () => {
      const userMsg = conversation.addMessage("Test", "user")
      const original = conversation.addMessage("Original", "assistant")
      
      // Create 9 retries (10 total with original)
      const retries = []
      for (let i = 0; i < 9; i++) {
        retries.push(conversation.createRetry(original._id))
      }
      
      // 10th retry should fail or be handled gracefully
      expect(() => conversation.createRetry(original._id)).toThrow()
      
      console.log("✓ Retry limit test passed")
    })
  })

  describe("Current Implementation Issues", () => {
    test("FAILING: demonstrates the conversation flow bug", () => {
      // This test should fail with current implementation
      const userMsg = conversation.addMessage("Question", "user")
      const assistantMsg1 = conversation.addMessage("Answer 1", "assistant")
      const assistantMsg2 = conversation.createRetry(assistantMsg1._id)
      const assistantMsg3 = conversation.createRetry(assistantMsg2._id)

      // BUG: This might fail because retry creates new conversation branch
      // instead of staying in the existing one
      expect(assistantMsg3.conversationBranchId).toBe(assistantMsg2.conversationBranchId)
      
      console.log("🐛 This test reveals the conversation flow bug")
    })
  })
})