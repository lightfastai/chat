# Quick HTTP Streaming Test

## Steps to Test:

1. **Start dev server**: `pnpm run dev:www`

2. **Open browser with DevTools Console** (F12)

3. **Enable HTTP Streaming**:
   - Go to http://localhost:3000/chat/settings
   - Toggle ON "HTTP Streaming" 
   - Page will reload

4. **IMPORTANT: Use an existing chat thread**
   - Go to an existing chat (not "New Chat")
   - Or create a new chat first, then send a second message

5. **Send a test message** and watch console for:
   ```
   🎯 handleSendMessage called: {
     httpStreamingEnabled: true,  // <-- Should be true
     hasCurrentThread: true,      // <-- Must be true
     ...
   }
   
   🚀 Using HTTP streaming mode for message: {
     threadId: "...",
     modelId: "...",
     httpStreamingEnabled: true
   }
   
   🌊 HTTP Streaming: Starting stream for message: ...
   ```

## Why it might not work:

1. **New Chat**: HTTP streaming only works on existing threads
2. **Settings not loaded**: Check the debug log shows `httpStreamingEnabled: true`
3. **Attachments/Web Search**: These bypass HTTP streaming

## Debug Checklist:

Look for this in console:
```
🔍 HTTP Streaming Debug: {
  finalUserSettings: {...},
  experimentalFeatures: {httpStreaming: true},  // <-- Must be true
  httpStreamingEnabled: true                     // <-- Must be true
}
```

If `httpStreamingEnabled` is false, try:
1. Hard refresh (Ctrl+Shift+R)
2. Clear cache and reload
3. Check settings page shows toggle as ON