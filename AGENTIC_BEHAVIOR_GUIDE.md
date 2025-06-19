# Agentic Behavior in AI SDK v5 (Alpha)

This guide explains how to enable iterative tool calling (agentic behavior) in the AI SDK v5 alpha version, which replaces the `maxSteps` parameter from earlier versions.

## Key Changes from Earlier Versions

In AI SDK v5, the `maxToolRoundtrips` parameter has been replaced with a more flexible system:

1. **`stopWhen`** - Controls when to stop iterative tool calling
2. **`prepareStep`** - Allows dynamic configuration between steps
3. **`activeTools`** - Limits available tools per call

## Basic Implementation

```typescript
import { streamText, stepCountIs, hasToolCall } from 'ai';

// Simple example: Allow up to 5 iterations
const result = await streamText({
  model: yourModel,
  messages: messages,
  tools: {
    web_search: createWebSearchTool(),
    calculator: createCalculatorTool(),
  },
  stopWhen: stepCountIs(5), // Stop after 5 steps
});
```

## Advanced Stop Conditions

### Multiple Conditions
```typescript
const result = await streamText({
  model: yourModel,
  messages: messages,
  tools: yourTools,
  stopWhen: [
    stepCountIs(10), // Max 10 steps
    hasToolCall('finalAnswer'), // Or stop when finalAnswer tool is called
  ],
});
```

### Custom Stop Condition
```typescript
const result = await streamText({
  model: yourModel,
  messages: messages,
  tools: yourTools,
  stopWhen: ({ steps, toolCalls }) => {
    // Custom logic
    const totalTokens = steps.reduce((sum, step) => 
      sum + (step.usage?.totalTokens || 0), 0
    );
    return totalTokens > 5000; // Stop if total tokens exceed 5000
  },
});
```

## Dynamic Step Preparation

The `prepareStep` function allows you to dynamically adjust behavior between iterations:

```typescript
const result = await streamText({
  model: yourModel,
  messages: messages,
  tools: {
    search: searchTool,
    analyze: analyzeTool,
    summarize: summarizeTool,
  },
  prepareStep: async ({ toolCalls, steps }) => {
    // After 3 steps, limit to just summarization
    if (steps.length >= 3) {
      return {
        activeTools: ['summarize'],
        system: 'Please summarize your findings concisely.',
      };
    }
    
    // If search was just called, suggest analysis
    const lastToolCall = toolCalls[toolCalls.length - 1];
    if (lastToolCall?.toolName === 'search') {
      return {
        system: 'Analyze the search results and determine if more information is needed.',
      };
    }
    
    // Default behavior
    return {};
  },
  stopWhen: stepCountIs(10),
});
```

## Implementation in the Chat App

The chat application has been updated to support iterative tool calling:

```typescript
// In convex/messages.ts
if (args.webSearchEnabled) {
  streamOptions.tools = {
    web_search: createWebSearchTool(),
  }
  
  // Enable iterative tool calling
  streamOptions.stopWhen = stepCountIs(5) // Allow up to 5 iterations
}
```

This allows the AI to:
1. Perform an initial web search
2. Analyze the results
3. Perform follow-up searches if needed
4. Synthesize information across multiple searches
5. Provide a comprehensive answer

## Best Practices

1. **Set Reasonable Limits**: Don't allow unlimited iterations to prevent runaway costs
2. **Use Multiple Conditions**: Combine step count limits with specific tool calls
3. **Dynamic Adaptation**: Use `prepareStep` to guide the AI's behavior based on previous steps
4. **Monitor Usage**: Track token usage across iterations to control costs

## Comparison with Earlier Versions

| Earlier Versions | AI SDK v5 Alpha |
|-----------------|-----------------|
| `maxToolRoundtrips: 5` | `stopWhen: stepCountIs(5)` |
| Fixed behavior | Dynamic with `prepareStep` |
| All tools always available | Can limit with `activeTools` |
| Simple stop condition | Complex conditions possible |

## Full Example with All Features

```typescript
const result = await streamText({
  model: yourModel,
  messages: messages,
  tools: {
    web_search: webSearchTool,
    calculator: calculatorTool,
    code_executor: codeExecutorTool,
    final_answer: finalAnswerTool,
  },
  
  // Stop conditions
  stopWhen: [
    stepCountIs(8), // Max 8 iterations
    hasToolCall('final_answer'), // Stop when final answer is provided
    ({ steps }) => {
      // Stop if we've used more than 10k tokens
      const totalTokens = steps.reduce((sum, step) => 
        sum + (step.usage?.totalTokens || 0), 0
      );
      return totalTokens > 10000;
    },
  ],
  
  // Dynamic step preparation
  prepareStep: async ({ toolCalls, steps }) => {
    const stepCount = steps.length;
    
    // Guide the AI through phases
    if (stepCount === 0) {
      return {
        system: 'Start by understanding what information you need.',
      };
    }
    
    if (stepCount >= 5) {
      return {
        activeTools: ['final_answer'],
        system: 'You have gathered enough information. Please provide a final answer.',
      };
    }
    
    // Adaptive tool selection based on previous calls
    const recentTools = toolCalls.slice(-3).map(tc => tc.toolName);
    if (recentTools.filter(t => t === 'web_search').length >= 2) {
      return {
        activeTools: ['calculator', 'code_executor', 'final_answer'],
        system: 'You have searched enough. Now analyze or calculate based on your findings.',
      };
    }
    
    return {};
  },
  
  // Other options
  temperature: 0.7,
  system: 'You are a helpful assistant with access to various tools. Use them iteratively to provide comprehensive answers.',
});
```

## Migration Guide

If you're migrating from an earlier version:

```typescript
// Old approach
const result = await streamText({
  model: yourModel,
  messages: messages,
  tools: yourTools,
  maxToolRoundtrips: 5, // DEPRECATED
});

// New approach
const result = await streamText({
  model: yourModel,
  messages: messages,
  tools: yourTools,
  stopWhen: stepCountIs(5), // Equivalent behavior
});
```

For more complex scenarios, leverage the new features for better control over the agentic behavior.