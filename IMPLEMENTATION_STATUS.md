# Tool UI Implementation Status

## Overview
This document tracks all changes made for implementing tool UI rendering with Vercel AI SDK v5 parts, and identifies what needs to be fixed.

## Changed Files & Issues

### 1. **convex/schema.ts**
**Changes:**
- Added `parts: v.optional(v.array(v.any()))` field to messages table

**Issues:**
- This field shouldn't be stored in the database
- Vercel AI SDK uses `toolInvocations` array instead
- `parts` is computed on the client side for UI rendering

**Fix needed:**
- Remove `parts` field
- Add `toolInvocations: v.optional(v.array(v.any()))` instead

### 2. **convex/messages/mutations.ts**
**Changes:**
- Added `parts: []` to all message inserts (send, createThreadAndSend, createStreamingMessage, createErrorMessage)
- Added `usage: undefined` to all message inserts
- Created `addMessagePart` mutation
- Created `updateToolInvocation` mutation

**Issues:**
- `parts` shouldn't be stored in database
- `usage: undefined` is correct and needed (was missing before)

**Fix needed:**
- Remove `parts: []` from all inserts
- Keep `usage: undefined` additions
- Repurpose mutations to work with `toolInvocations` instead

### 3. **convex/messages/actions.ts**
**Changes:**
- Modified `generateAIResponseWithMessage` to use `fullStream` instead of `textStream`
- Added handlers for tool-call, tool-result, tool-call-streaming-start events
- Added calls to `addMessagePart` and `updateToolInvocation`

**Issues:**
- Currently disabled for debugging
- Trying to store UI parts in database instead of tool invocations

**Fix needed:**
- Store tool invocations in a `toolInvocations` array on the message
- Update tool invocations as they progress through states

### 4. **convex/messages/types.ts**
**Changes:**
- Added part validators (textPartValidator, toolInvocationPartValidator, etc.)
- Added `parts: v.optional(v.array(v.any()))` to messageReturnValidator

**Issues:**
- These validators are for UI parts, not database storage
- messageReturnValidator shouldn't include parts

**Fix needed:**
- Remove parts from messageReturnValidator
- Add toolInvocations field instead

### 5. **convex/messages.ts**
**Changes:**
- Exported `addMessagePart` and `updateToolInvocation`

**Fix needed:**
- Export functions for managing toolInvocations instead

### 6. **src/components/chat/shared/MessageItem.tsx**
**Changes:**
- Added logic to render parts when available
- Currently disabled for debugging with `false &&`

**Issues:**
- Expects parts from database, but parts should be computed client-side

**Fix needed:**
- Compute parts from message content and toolInvocations
- Use Vercel AI SDK's `getMessageParts()` pattern

### 7. **src/components/chat/tools/**
**New files created:**
- ToolInvocation.tsx
- WebSearchTool.tsx
- GenericToolDisplay.tsx

**Issues:**
- These expect a different part structure than Vercel AI SDK
- WebSearchTool has a runtime error fix for undefined results

**Fix needed:**
- Update to match Vercel AI SDK's ToolInvocationUIPart structure
- Ensure proper null checks

### 8. **src/hooks/useAuth.ts**
**Changes:**
- Added `@ts-expect-error` comment for TypeScript deep instantiation issue

**Issues:**
- This is a workaround for complex schema types

**Fix needed:**
- Simplifying the schema should help resolve this

### 9. **convex/lib/message_builder.ts**
**Changes:**
- Added `@ts-expect-error` comment

**Fix needed:**
- Keep as is (well-documented TypeScript limitation)

## Summary of Core Issues

1. **Fundamental misunderstanding**: I tried to store UI `parts` in the database, but Vercel AI SDK computes parts on the client from `toolInvocations`

2. **Schema mismatch**: Added `parts` field instead of `toolInvocations` field

3. **Structure mismatch**: My part structure doesn't match Vercel AI SDK's expected structure

4. **Missing conversion layer**: Need client-side logic to convert messages to UIMessages with parts

## Next Steps

1. Remove `parts` field from schema and all mutations
2. Add `toolInvocations` field instead
3. Update streaming to store tool invocations (not parts)
4. Create client-side conversion using Vercel AI SDK patterns
5. Update UI components to work with proper part structure