# Debugging Convex HTTP Streaming

## Current Issue
The HTTP endpoint `/stream-chat` is not accessible, resulting in "Failed to fetch" error.

## Things to Check:

### 1. Check Convex Dashboard
- Go to your Convex dashboard
- Check Functions → HTTP
- Verify `/stream-chat` endpoint is listed
- Check if it's deployed

### 2. Check Convex Deployment
Run in terminal:
```bash
npx convex deploy
```

This will ensure all HTTP endpoints are deployed.

### 3. Check the Console Output
When you try to send a message with HTTP streaming enabled, check:
- What is the "Convex URL" logged?
- What is the "Stream URL" logged?
- Are there any other error messages?

### 4. Test HTTP Endpoint Directly
Try accessing the endpoint directly in your browser:
```bash
# For local development
curl -X POST http://localhost:3210/stream-chat \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# For production (replace with your actual deployment)
curl -X POST https://your-deployment.convex.site/stream-chat \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 5. Alternative: Use Convex Actions
If HTTP endpoints aren't working, we can refactor to use Convex actions with streaming:
- Convert `httpAction` to regular `action`
- Use Server-Sent Events (SSE) for streaming
- Or use WebSocket-based streaming

## Quick Fix: Disable HTTP Streaming
If you need to continue testing other features:
1. Go to Settings
2. Turn OFF "HTTP Streaming"
3. The chat will use standard Convex mutations

## Next Steps
1. Check if `npx convex deploy` fixes the issue
2. Look at Convex logs for any errors
3. We may need to refactor to use a different streaming approach