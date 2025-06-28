# HTTP Streaming Test Guide

## How to Test HTTP Streaming in Local Mode

### 1. Start the Dev Server
```bash
pnpm run dev:www
```

### 2. Open Browser DevTools Console
- Open http://localhost:3000
- Press F12 to open DevTools
- Go to the Console tab

### 3. Enable HTTP Streaming
1. Go to Settings (http://localhost:3000/chat/settings)
2. Scroll to "Experimental Features"
3. Toggle ON "HTTP Streaming"
4. You should see the toggle become blue/active

### 4. Start a New Chat
1. Click "New Chat" or go to http://localhost:3000/chat
2. Send a message like "Write a short story about a robot"

### 5. What to Look for in Console

#### When HTTP Streaming is ENABLED:
```
🚀 Using HTTP streaming mode for message: {
  threadId: "...",
  modelId: "claude-3-5-sonnet-20241022",
  httpStreamingEnabled: true
}

🌊 HTTP Streaming: Starting stream for message: Write a short story about a robot

🌊 HTTP Streaming: Making request to: https://your-convex-url/stream-chat {
  threadId: "...",
  modelId: "claude-3-5-sonnet-20241022",
  messageCount: 2
}

🌊 HTTP Streaming: Received text chunk: {
  chunkLength: 15,
  totalLength: 15,
  timestamp: "2025-01-28T..."
}
// Multiple chunks will appear every ~200ms
```

#### When HTTP Streaming is DISABLED:
```
📡 Using standard Convex mutations (not HTTP streaming): {
  httpStreamingEnabled: false,
  currentThread: true,
  hasAttachments: false,
  webSearchEnabled: false
}
```

### 6. Check Network Tab
1. Go to Network tab in DevTools
2. Look for a request to `/stream-chat`
3. Click on it and go to "Response" tab
4. You should see streaming chunks in NDJSON format:
```json
{"type":"text-delta","text":"Once upon","messageId":"...","timestamp":1706400000000}
{"type":"text-delta","text":" a time...","messageId":"...","timestamp":1706400000200}
{"type":"completion","messageId":"...","timestamp":1706400001000}
```

### 7. Check Convex Dashboard Logs
If you have access to Convex dashboard:
1. Go to Functions → Logs
2. Look for logs from `httpStreaming:streamChatResponse`
3. You'll see batching stats:
```
🔄 HTTP Streaming Batch #1: {
  batchSize: 47,
  timeSinceLastBatch: 201,
  totalElapsed: 201
}

✅ HTTP Streaming Complete: {
  totalBatches: 5,
  totalTokens: 237,
  totalTime: 1234,
  avgBatchSize: 47.4,
  dbWriteSavings: "98%"
}
```

## Key Differences to Observe

### With HTTP Streaming:
- Text appears in larger chunks (every 200ms)
- Fewer database writes (check Convex dashboard)
- Network shows single `/stream-chat` request
- Console shows HTTP streaming logs

### Without HTTP Streaming:
- Text appears word by word
- Many database writes (one per word)
- WebSocket messages for each word
- Console shows standard Convex mutation logs

## Troubleshooting

### If toggle doesn't work:
1. Check console for errors
2. Try refreshing the page
3. Clear localStorage: `localStorage.clear()` in console

### If HTTP streaming doesn't activate:
1. Make sure you're in an existing chat (not new chat)
2. Check that experimental features is truly enabled
3. Don't use attachments or web search (they bypass HTTP streaming)

### To force a specific mode for testing:
```javascript
// In browser console, to check current state:
localStorage.getItem('experimentalFeatures')

// To manually enable (temporary):
window.__forceHTTPStreaming = true
```