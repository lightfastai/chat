import { describe, expect, test } from "bun:test"

describe("Message Variant Navigation Bug", () => {
  test("Should show correct variant count for specific message", () => {
    // Simulate the user's scenario:
    // 1. User: "hey" → Assistant: "response1" → User retries 5 times
    // 2. User: "test" → Assistant: "response2" → User retries once
    // 3. Expected: response2 shows "1/2", not "5/5"
    
    const messages = [
      // Main conversation
      { _id: "user1", body: "hey", messageType: "user", conversationBranchId: "main", timestamp: 1000 },
      { _id: "ai1", body: "response1", messageType: "assistant", conversationBranchId: "main", timestamp: 1001 },
      
      // Branch 1: retry of ai1
      { _id: "ai1_retry1", body: "response1_v2", messageType: "assistant", conversationBranchId: "branch_ai1_1750046000000_abc", branchPoint: "user1", timestamp: 1002 },
      
      // Branch 2: retry of ai1 again  
      { _id: "ai1_retry2", body: "response1_v3", messageType: "assistant", conversationBranchId: "branch_ai1_1750046001000_def", branchPoint: "user1", timestamp: 1003 },
      
      // Branch 3: retry of ai1 again
      { _id: "ai1_retry3", body: "response1_v4", messageType: "assistant", conversationBranchId: "branch_ai1_1750046002000_ghi", branchPoint: "user1", timestamp: 1004 },
      
      // Branch 4: retry of ai1 again
      { _id: "ai1_retry4", body: "response1_v5", messageType: "assistant", conversationBranchId: "branch_ai1_1750046003000_jkl", branchPoint: "user1", timestamp: 1005 },
      
      // Continue in branch 4: User says "test"
      { _id: "user2", body: "test", messageType: "user", conversationBranchId: "branch_ai1_1750046003000_jkl", timestamp: 1006 },
      { _id: "ai2", body: "response2", messageType: "assistant", conversationBranchId: "branch_ai1_1750046003000_jkl", timestamp: 1007 },
      
      // Branch 5: retry of ai2 (the new assistant message)
      { _id: "ai2_retry1", body: "response2_v2", messageType: "assistant", conversationBranchId: "branch_ai2_1750046004000_mno", branchPoint: "user2", timestamp: 1008 },
    ]
    
    // Function to find variants of a specific message
    const findMessageVariants = (targetMessageId: string) => {
      const targetMessage = messages.find(m => m._id === targetMessageId)
      if (!targetMessage) return []
      
      // Find the user message that prompted this assistant response
      let userMessage = null
      
      if (targetMessage.branchPoint) {
        // This is a retry message - find the user message it branches from
        userMessage = messages.find(m => m._id === targetMessage.branchPoint)
      } else {
        // This is an original message - find the previous user message in the same branch
        userMessage = messages
          .filter(m => 
            m.messageType === "user" && 
            m.timestamp < targetMessage.timestamp &&
            m.conversationBranchId === targetMessage.conversationBranchId
          )
          .sort((a, b) => b.timestamp - a.timestamp)[0]
      }
      
      if (!userMessage) return [targetMessage]
      
      console.log(`Finding variants for ${targetMessageId}, user message: ${userMessage._id}`)
      
      // Find all assistant messages that are responses to this user message:
      // 1. The original response (look across all branches)
      // 2. All retries that have branchPoint = userMessage._id
      const variants = []
      
      // Find the original response to this user message
      const originalResponse = messages.find(m => 
        m.messageType === "assistant" && 
        m.timestamp > userMessage.timestamp &&
        !m.branchPoint &&
        // Either in main branch or in a branch that contains this user message
        (m.conversationBranchId === "main" || 
         messages.some(um => 
           um._id === userMessage._id && 
           um.conversationBranchId === m.conversationBranchId
         ))
      )
      
      if (originalResponse) {
        variants.push(originalResponse)
      }
      
      // Add all retries that branch from this user message
      const retries = messages.filter(m => 
        m.messageType === "assistant" && 
        m.branchPoint === userMessage._id
      )
      
      variants.push(...retries)
      
      // Remove duplicates and sort
      const uniqueVariants = variants.filter((v, i, arr) => 
        arr.findIndex(x => x._id === v._id) === i
      )
      
      return uniqueVariants.sort((a, b) => a.timestamp - b.timestamp)
    }
    
    // Test ai1 variants (should be 5 total: original + 4 retries)
    const ai1Variants = findMessageVariants("ai1")
    expect(ai1Variants).toHaveLength(5)
    expect(ai1Variants.map(v => v._id)).toEqual(["ai1", "ai1_retry1", "ai1_retry2", "ai1_retry3", "ai1_retry4"])
    
    // Test ai2 variants (should be 2 total: original + 1 retry)
    const ai2Variants = findMessageVariants("ai2")
    console.log("AI2 message:", messages.find(m => m._id === "ai2"))
    console.log("AI2 variants found:", ai2Variants.map(v => ({ id: v._id, branchPoint: v.branchPoint })))
    expect(ai2Variants).toHaveLength(2)
    expect(ai2Variants.map(v => v._id)).toEqual(["ai2", "ai2_retry1"])
    
    // Test navigation for ai2_retry1 (should show 2/2, not 5/5)
    const ai2RetryVariants = findMessageVariants("ai2_retry1")
    console.log("AI2 retry variants:", ai2RetryVariants.map(v => ({ id: v._id, branchPoint: v.branchPoint })))
    expect(ai2RetryVariants).toHaveLength(2)
    const ai2RetryIndex = ai2RetryVariants.findIndex(v => v._id === "ai2_retry1")
    expect(ai2RetryIndex).toBe(1) // Second variant (index 1)
    
    console.log("AI1 variants:", ai1Variants.length, ai1Variants.map(v => v.body))
    console.log("AI2 variants:", ai2Variants.length, ai2Variants.map(v => v.body))
    console.log("AI2 retry navigation:", `${ai2RetryIndex + 1}/${ai2RetryVariants.length}`)
  })
})