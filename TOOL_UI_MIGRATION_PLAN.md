# Tool UI Migration Plan: Adopting Vercel AI SDK v5 Parts

## Overview
This document outlines the migration from our current tool implementation to Vercel AI SDK v5's parts-based approach, enabling custom UI for different tool calls.

## Current vs Target Architecture

### Current State
- Tools executed server-side in `convex/messages/actions.ts`
- Tool results embedded in AI response text
- No UI visibility of tool invocations
- Messages stored as simple strings

### Target State
- Tool invocations stored as structured message parts
- Custom UI components for each tool type
- Full visibility of tool states (partial-call, call, result, error)
- Rich message structure with typed parts

## Implementation Plan

### Phase 1: Update Message Schema
```typescript
// convex/schemas.ts - Add to messages table
messages: defineTable({
  // ... existing fields ...
  
  // New fields for v5 compatibility
  parts: v.optional(v.array(v.object({
    type: v.union(
      v.literal("text"),
      v.literal("tool-invocation"),
      v.literal("reasoning"),
      v.literal("source"),
      v.literal("step-start")
    ),
    content: v.optional(v.string()),
    
    // Tool invocation specific fields
    toolCallId: v.optional(v.string()),
    toolName: v.optional(v.string()),
    args: v.optional(v.any()),
    state: v.optional(v.union(
      v.literal("partial-call"),
      v.literal("call"),
      v.literal("result"),
      v.literal("error")
    )),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
  }))),
})
```

### Phase 2: Update Server-Side Streaming
```typescript
// convex/messages/actions.ts - Modify streamText handling
for await (const part of fullStream) {
  switch (part.type) {
    case "text-delta":
      // Existing text handling
      break;
      
    case "tool-call":
      // Store tool call as message part
      await ctx.runMutation(internal.messages.addMessagePart, {
        messageId,
        part: {
          type: "tool-invocation",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          args: part.args,
          state: "call",
        }
      });
      break;
      
    case "tool-result":
      // Update tool invocation with result
      await ctx.runMutation(internal.messages.updateToolInvocation, {
        messageId,
        toolCallId: part.toolCallId,
        state: "result",
        result: part.result,
      });
      break;
  }
}
```

### Phase 3: Create Tool UI Components

#### Base Tool Invocation Component
```tsx
// src/components/chat/tools/ToolInvocation.tsx
export function ToolInvocation({ part }: { part: ToolInvocationPart }) {
  switch (part.toolName) {
    case "webSearch":
      return <WebSearchTool part={part} />;
    case "computerUse":
      return <ComputerUseTool part={part} />;
    default:
      return <GenericToolDisplay part={part} />;
  }
}
```

#### Web Search Tool UI
```tsx
// src/components/chat/tools/WebSearchTool.tsx
export function WebSearchTool({ part }: { part: ToolInvocationPart }) {
  if (part.state === "partial-call" || part.state === "call") {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-lg">
        <Search className="w-4 h-4 animate-pulse" />
        <span className="text-sm text-muted-foreground">
          Searching for: {part.args?.query}
        </span>
      </div>
    );
  }
  
  if (part.state === "result") {
    return (
      <div className="p-3 border rounded-lg space-y-2">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium">Search Results</span>
        </div>
        {part.result?.results?.map((result: any, i: number) => (
          <div key={i} className="pl-6 space-y-1">
            <a href={result.url} className="text-sm text-blue-500 hover:underline">
              {result.title}
            </a>
            <p className="text-xs text-muted-foreground">{result.snippet}</p>
          </div>
        ))}
      </div>
    );
  }
  
  return null;
}
```

### Phase 4: Update Message Rendering
```tsx
// src/components/chat/shared/MessageItem.tsx - Modified
export function MessageItem({ message, ... }) {
  // ... existing code ...
  
  // If message has parts, render them instead of just body
  if (message.parts && message.parts.length > 0) {
    return (
      <MessageLayout
        avatar={avatar}
        content={
          <div className="space-y-2">
            {message.parts.map((part, index) => {
              switch (part.type) {
                case "text":
                  return <Markdown key={index}>{part.content}</Markdown>;
                case "tool-invocation":
                  return <ToolInvocation key={index} part={part} />;
                case "reasoning":
                  return <ThinkingContent key={index} content={part.content} />;
                default:
                  return null;
              }
            })}
          </div>
        }
        // ... rest of props
      />
    );
  }
  
  // Fallback to existing rendering for backwards compatibility
  // ... existing rendering logic ...
}
```

### Phase 5: Client-Side Tool Support (Future)
```tsx
// For tools that require user interaction
export function ComputerUseTool({ part, onAddToolResult }: { 
  part: ToolInvocationPart,
  onAddToolResult: (toolCallId: string, result: any) => void 
}) {
  if (part.state === "call" && part.args?.requiresConfirmation) {
    return (
      <div className="p-4 border rounded-lg space-y-3">
        <p className="text-sm">The AI wants to: {part.args.action}</p>
        <div className="flex gap-2">
          <Button 
            size="sm"
            onClick={() => onAddToolResult(part.toolCallId, { confirmed: true })}
          >
            Allow
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onAddToolResult(part.toolCallId, { confirmed: false })}
          >
            Deny
          </Button>
        </div>
      </div>
    );
  }
  
  // ... rest of rendering logic
}
```

## Migration Steps

1. **Add backward-compatible schema changes**
   - Add optional `parts` field to messages table
   - Maintain existing `body` field for compatibility

2. **Update server streaming logic**
   - Capture tool invocations as message parts
   - Continue updating `body` for backward compatibility

3. **Create tool UI components**
   - Start with WebSearchTool
   - Add loading, success, and error states

4. **Update message rendering**
   - Check for `parts` first, fall back to `body`
   - Gradually migrate all messages to parts-based

5. **Test and iterate**
   - Ensure backward compatibility
   - Test all tool states and edge cases

## Benefits

1. **Transparency**: Users see when tools are being used
2. **Rich UI**: Custom visualizations for each tool type
3. **Interactivity**: Support for client-side tools requiring user input
4. **Debugging**: Clear visibility into tool execution flow
5. **Extensibility**: Easy to add new tool types with custom UI

## Example Tools to Implement

1. **Web Search**: Show search query, results with links
2. **Computer Use**: Show screenshots, actions, confirmations
3. **Code Execution**: Show code blocks, outputs, errors
4. **File Operations**: Show file paths, previews, confirmations
5. **API Calls**: Show endpoints, payloads, responses

## Next Steps

1. Create feature branch for implementation
2. Start with Phase 1 (schema updates)
3. Implement WebSearchTool as proof of concept
4. Gather feedback and iterate