# Computer Tool Integration with streamText

## Overview

This document explains how to integrate the Lightfast Computer tool for git clone and file analysis operations within the chat application's streamText functionality.

## Integration Architecture

```
User Request → AI interprets → Tool Call → Computer Instance → Stream Output → AI Response
```

## Key Integration Points

### 1. Tool Result Handling in streamText

When the Computer tool is called during streaming, the results flow through the AI SDK's tool handling:

```typescript
// In convex/messages/actions.ts
if (streamPart.type === "tool-result") {
  // The Computer tool results are automatically integrated into the AI's context
  // The AI will process and explain the results in its response
  // Streaming output from commands is captured in the tool result
}
```

### 2. Streaming Command Output

The Computer tool can stream command output in real-time:

```typescript
// During git clone
onData: (chunk) => {
  // This output is captured and included in the tool result
  // The AI sees this and can reference it in the response
}
```

### 3. Tool Definition Pattern

```typescript
export function createGitAnalysisTool() {
  return tool({
    description: "Clone and analyze git repositories...",
    parameters: z.object({
      // Structured parameters for different operations
    }),
    execute: async (params) => {
      // Returns structured data that AI can interpret
      return {
        success: true,
        streamedOutput: [], // Command output
        analysis: {},       // Structured results
      }
    }
  })
}
```

## Usage Examples

### Example 1: Cloning and Analyzing a Repository

**User**: "Can you analyze the structure of github.com/vercel/next.js?"

**AI Tool Call**:
```json
{
  "action": "clone_and_analyze",
  "repoUrl": "https://github.com/vercel/next.js",
  "maxDepth": 3
}
```

**Tool Result** (included in AI context):
```json
{
  "success": true,
  "repoPath": "/tmp/next.js",
  "stats": {
    "totalFiles": 5234,
    "languages": {
      "TypeScript": "65%",
      "JavaScript": "20%"
    }
  },
  "streamedOutput": [
    "📦 Cloning repository...",
    "✅ Clone completed",
    "📊 Analyzing structure..."
  ]
}
```

**AI Response**: "I've cloned and analyzed the Next.js repository. It contains 5,234 files with TypeScript being the primary language at 65%..."

### Example 2: Searching for Specific Code

**User**: "Find all React hooks in the codebase"

**AI Tool Call**:
```json
{
  "action": "search_code",
  "searchQuery": "^use[A-Z]",
  "filePattern": "*.ts,*.tsx"
}
```

## Security Considerations

1. **Command Allowlist**: Only safe commands are permitted (git, cat, grep, find, etc.)
2. **Isolated Environment**: Each Computer instance runs in an isolated container
3. **Timeout Protection**: All commands have configurable timeouts
4. **Path Restrictions**: Operations are confined to designated directories

## Implementation Checklist

- [x] Basic tool structure with operations (clone, analyze, search)
- [x] Streaming output integration
- [x] Structured result format for AI interpretation
- [ ] Actual Computer SDK integration
- [ ] Instance lifecycle management
- [ ] Session-based instance pooling
- [ ] Error recovery and retry logic

## Benefits

1. **Real-time Feedback**: Users see progress as operations execute
2. **Structured Analysis**: AI receives organized data to provide insights
3. **Flexible Operations**: Supports various git and file analysis tasks
4. **Safe Execution**: Sandboxed environment with security constraints

## Next Steps

1. Integrate actual Computer SDK client
2. Add instance management for efficient resource usage
3. Implement caching for repeated operations
4. Add more sophisticated code analysis capabilities