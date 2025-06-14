# TODO: Activate BYOK (Bring Your Own Keys) Feature

This document tracks what needs to be done to fully activate the BYOK feature once the Convex development environment is properly set up.

## Status

✅ **COMPLETED**:
- Database schema design for userSettings table
- Secure API key storage functions in Convex
- Settings UI for API key management
- Settings layout with navigation
- User dropdown navigation updates
- Visual indicator for messages generated with user's API keys
- Message schema extension to track BYOK usage
- Build validation and linting compliance

🔄 **PENDING ACTIVATION** (requires Convex dev environment):

### 1. Uncomment API Integration in Convex Backend

**File**: `convex/messages.ts` (lines 265-268)
```typescript
// TODO: Uncomment when Convex API is regenerated
const userApiKeys = await ctx.runMutation(
  internal.userSettings.getDecryptedApiKeys,
  { userId: thread.userId },
)
```

**File**: `convex/messages.ts` (lines 313-316)
```typescript
// TODO: Implement user API key selection when Convex API is regenerated
const selectedModel =
  provider === "anthropic"
    ? (userApiKeys?.anthropic 
        ? anthropic(actualModelName, { apiKey: userApiKeys.anthropic })
        : anthropic(actualModelName))
    : (userApiKeys?.openai
        ? openai(actualModelName, { apiKey: userApiKeys.openai })
        : openai(actualModelName))
```

**File**: `convex/titles.ts` (lines 38-41)
```typescript
// TODO: Uncomment when Convex API is regenerated
const userApiKeys = await ctx.runMutation(
  internal.userSettings.getDecryptedApiKeys,
  { userId: thread.userId },
)
```

**File**: `convex/titles.ts` (lines 45-47)
```typescript
// TODO: Implement user API key selection when Convex API is regenerated
const model = (userApiKeys && userApiKeys.openai)
  ? openai("gpt-4o-mini", { apiKey: userApiKeys.openai })
  : openai("gpt-4o-mini")
```

### 2. Uncomment API Integration in React Components

**File**: `src/components/settings/api-keys-manager.tsx` (lines 23-25)
```typescript
// TODO: Uncomment when Convex API is regenerated
const userSettings = useQuery(api.userSettings.getUserSettings)
const updateApiKeys = useMutation(api.userSettings.updateApiKeys)
const removeApiKey = useMutation(api.userSettings.removeApiKey)
```

### 3. Enable Visual Indicator Logic

**File**: `convex/messages.ts` (lines 276-280) - Enable BYOK tracking
```typescript
// TODO: Enable this logic when userApiKeys is properly implemented
// Replace: const willUseUserApiKey = false
// With:
const willUseUserApiKey = 
  (provider === "anthropic" && userApiKeys && userApiKeys.anthropic) ||
  (provider === "openai" && userApiKeys && userApiKeys.openai)
```

**File**: `src/components/settings/api-keys-manager.tsx` (lines 8-9)
```typescript
import { api } from "../../../convex/_generated/api"
import { useMutation, useQuery } from "convex/react"
```

**Remove Mock Implementations** (lines 32-36):
```typescript
// Remove these lines:
const userSettings = { hasOpenAIKey: false, hasAnthropicKey: false }
const updateApiKeys = async (_args: { openaiKey?: string; anthropicKey?: string }) => {}
const removeApiKey = async (_args: { provider: "openai" | "anthropic" }) => {}
```

## Activation Steps

1. **Set up Convex development environment**:
   ```bash
   cd worktrees/bring-your-own-keys
   pnpm convex:dev
   ```

2. **Regenerate Convex API types** (happens automatically with convex dev)

3. **Uncomment all TODO sections** listed above

4. **Test the complete workflow**:
   - Navigate to `/settings/api-keys`
   - Add OpenAI and/or Anthropic API keys
   - Start a new chat conversation
   - Verify that user's API keys are being used

5. **Validate error handling**:
   - Test with invalid API keys
   - Test API key removal
   - Test mixed scenarios (one provider with user key, other with default)

## Security Notes

- API keys are encrypted using base64 encoding (placeholder - should be replaced with proper encryption in production)
- Keys are only decrypted server-side when making API calls
- No sensitive data is exposed to the client
- Users can remove their keys at any time

## Architecture Notes

- Falls back gracefully to global API keys if user hasn't provided their own
- Supports mixed usage (user's OpenAI key + global Anthropic key, or vice versa)
- Thread-level isolation ensures user's keys are only used for their conversations
- Compatible with all existing AI models and providers

## Testing Checklist

- [ ] API key storage and retrieval
- [ ] Encryption/decryption of stored keys
- [ ] UI shows correct key status (configured/not configured)
- [ ] API key removal functionality
- [ ] Chat conversations use correct API keys
- [ ] Title generation uses correct API keys
- [ ] Fallback to global keys when user keys not available
- [ ] Error handling for invalid keys
- [ ] Settings navigation and layout
- [ ] Mobile responsive design