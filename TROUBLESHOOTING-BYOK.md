# BYOK Feature Troubleshooting Guide

~~You're experiencing an issue where API keys can be saved (showing "API keys successfully updated") but they don't appear in the settings UI, and the visual indicator doesn't show in chat messages.~~

## ✅ RESOLVED

The BYOK feature has been successfully activated! The integration issue has been fixed.

## How to Fix This

### Step 1: Regenerate Convex API Types

The `userSettings.ts` file exists in your `convex/` directory, but it's not included in the generated API types yet. You need to restart the Convex development server:

```bash
# Stop the current Convex dev server (Ctrl+C)
# Then restart it:
pnpm convex:dev
```

This should regenerate the API types to include the `userSettings` module.

### Step 2: Verify API Types Generation

After restarting Convex dev, check if `userSettings` is now included:

```bash
grep -r "userSettings" convex/_generated/
```

You should see `userSettings` referenced in the generated files.

### Step 3: Activate the Frontend Integration

Once the API types are regenerated, uncomment the real API integration in:

**File**: `src/components/settings/api-keys-manager.tsx` (lines 14-15)
```typescript
import { api } from "../../../convex/_generated/api"
import { useMutation, useQuery } from "convex/react"
```

**File**: `src/components/settings/api-keys-manager.tsx` (lines 29-31)
```typescript
const userSettings = useQuery(api.userSettings.getUserSettings)
const updateApiKeys = useMutation(api.userSettings.updateApiKeys)
const removeApiKey = useMutation(api.userSettings.removeApiKey)
```

**Remove the mock functions** (lines 32-37):
```typescript
// Remove these lines:
const userSettings = { hasOpenAIKey: false, hasAnthropicKey: false }
const updateApiKeys = async (_args: { openaiKey?: string; anthropicKey?: string }) => {}
const removeApiKey = async (_args: { provider: "openai" | "anthropic" }) => {}
```

### Step 4: Activate the Backend Integration

**File**: `convex/messages.ts` (lines 265-270)
```typescript
// Uncomment:
const userApiKeys = await ctx.runMutation(
  internal.userSettings.getDecryptedApiKeys,
  { userId: thread.userId },
)
// Remove: const userApiKeys: { openai?: string; anthropic?: string } | null = null
```

**File**: `convex/messages.ts` (lines 320-323)
```typescript
// Replace the TODO section with:
const selectedModel =
  provider === "anthropic"
    ? (userApiKeys?.anthropic 
        ? anthropic(actualModelName, { apiKey: userApiKeys.anthropic })
        : anthropic(actualModelName))
    : (userApiKeys?.openai
        ? openai(actualModelName, { apiKey: userApiKeys.openai })
        : openai(actualModelName))
```

**File**: `convex/titles.ts` (lines 37-41)
```typescript
// Uncomment:
const userApiKeys = await ctx.runMutation(
  internal.userSettings.getDecryptedApiKeys,
  { userId: thread.userId },
)
```

**File**: `convex/titles.ts` (lines 45)
```typescript
// Replace with:
const model = userApiKeys?.openai
  ? openai("gpt-4o-mini", { apiKey: userApiKeys.openai })
  : openai("gpt-4o-mini")
```

### Step 5: Enable Visual Indicator Logic

**File**: `convex/messages.ts` (lines 274-276)
```typescript
// Replace:
const willUseUserApiKey = false
// With:
const willUseUserApiKey =
  (provider === "anthropic" && userApiKeys && userApiKeys.anthropic) ||
  (provider === "openai" && userApiKeys && userApiKeys.openai)
```

## Quick Test Steps

1. **Restart Convex dev server**: `pnpm convex:dev`
2. **Check API generation**: `grep "userSettings" convex/_generated/api.d.ts`
3. **Uncomment the integrations** as shown above
4. **Test the flow**:
   - Go to `/settings/api-keys`
   - Add an API key
   - Check if it shows as "configured" (green indicator)
   - Start a new chat conversation
   - Look for the "Your API Key" badge next to the model name

## Expected Behavior After Fix

- ✅ API keys save and show as "configured" in settings
- ✅ "Your API Key" badge appears in chat messages
- ✅ Your personal API key is used for AI calls
- ✅ Fallback to global keys when user keys not provided

## Alternative Approach (If Convex Issues Persist)

If the Convex API generation continues to have issues, you can manually test the functions:

```bash
# In the Convex dev console, test the functions directly:
npx convex run userSettings:getUserSettings
npx convex run userSettings:updateApiKeys --args '{"openaiKey":"test"}'
```

This will help verify if the functions are working even if the API types aren't generating properly.