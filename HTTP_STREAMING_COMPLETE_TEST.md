# Complete HTTP Streaming Test Guide

## Prerequisites

### 1. Deploy Convex Functions
```bash
cd apps/www
npx convex deploy
```

This ensures HTTP endpoints are deployed.

### 2. Run Both Servers
In separate terminals:
```bash
# Terminal 1 - Next.js
pnpm run dev

# Terminal 2 - Convex
pnpm run convex:dev
```

## Test HTTP Endpoints

### 1. Find Your Convex Site URL
Check your `.env.local` file for `NEXT_PUBLIC_CONVEX_URL`. It should look like:
- Local: `http://127.0.0.1:3210`
- Production: `https://your-deployment.convex.cloud/api`

### 2. Test Basic HTTP Endpoint
```bash
# For local development
curl http://127.0.0.1:3210/test

# For production (replace with your deployment)
curl https://your-deployment.convex.site/test

# Should return: "HTTP endpoint is working!"
```

### 3. Test Stream Endpoint
```bash
# Test OPTIONS (CORS preflight)
curl -X OPTIONS http://127.0.0.1:3210/stream-chat -v

# Should return 200 OK with CORS headers
```

## Test in Browser

### 1. Enable HTTP Streaming
1. Go to http://localhost:3000/chat/settings
2. Toggle ON "HTTP Streaming"
3. Page will reload

### 2. Check Console (F12)
Look for these logs:
```
🔍 HTTP Streaming Debug: {
  httpStreamingEnabled: true
}

Convex URL: http://127.0.0.1:3210
Stream URL: http://127.0.0.1:3210/stream-chat
```

### 3. Send Test Message in Existing Chat
1. Go to an existing chat thread
2. Send a message
3. Watch console for:
```
🚀 Using HTTP streaming mode
🌊 HTTP Streaming: Starting stream
Auth token obtained: true
```

## Common Issues & Solutions

### Issue: "Failed to fetch"
**Cause**: HTTP endpoint not accessible

**Solutions**:
1. Run `npx convex deploy`
2. Check if Convex dev server is running
3. Verify URL construction in console logs

### Issue: "401 Unauthorized"
**Cause**: Auth token not being passed correctly

**Solutions**:
1. Check if logged in
2. Verify auth token is obtained (check console)

### Issue: "HTTP streaming not activating"
**Cause**: Conditions not met

**Check**:
- Must be in existing chat (not new)
- No attachments
- No web search enabled
- Settings properly saved

## Debug Checklist

1. ✅ HTTP test endpoint works: `curl http://127.0.0.1:3210/test`
2. ✅ Console shows `httpStreamingEnabled: true`
3. ✅ Console shows correct Stream URL
4. ✅ Auth token obtained
5. ✅ Using existing chat thread
6. ✅ No errors in Convex dashboard logs

## Alternative: Direct HTTP Test

Test the streaming endpoint directly:
```javascript
// In browser console
async function testStream() {
  const response = await fetch('http://127.0.0.1:3210/stream-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      threadId: 'test',
      modelId: 'gpt-4o-mini',
      messages: [{role: 'user', content: 'Hello'}]
    })
  });
  
  console.log('Response:', response.status, response.statusText);
  const text = await response.text();
  console.log('Body:', text);
}

testStream();
```

## If Nothing Works

1. **Check Convex Dashboard**
   - Go to Functions → HTTP
   - Verify endpoints are listed
   - Check logs for errors

2. **Fallback to WebSocket Streaming**
   - Turn off HTTP Streaming in settings
   - Use standard Convex mutations

3. **Report Issue**
   - Share console logs
   - Share network tab screenshot
   - Share Convex dashboard logs