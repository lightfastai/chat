# HTTP Streaming Local Development Issues

## Current Status
- HTTP endpoints return 404 in local development
- This is a known limitation with Convex local development

## Workaround Options

### Option 1: Use Convex Cloud (Recommended)
1. Login to Convex:
   ```bash
   npx convex login
   ```
2. Deploy to cloud:
   ```bash
   npx convex deploy
   ```
3. Update `.env.local` with cloud URL
4. Test with cloud deployment

### Option 2: Alternative Implementation
Instead of HTTP streaming, we can use Convex actions with a different approach:

1. **Use Convex Actions** instead of HTTP actions
2. **Use Server-Sent Events (SSE)** from Next.js API route
3. **Use WebSocket streaming** with Convex subscriptions

### Option 3: Test with Mock Data
For local development only, we can:
1. Create a Next.js API route that mimics the HTTP streaming
2. Use this for local testing
3. Switch to Convex HTTP in production

## Quick Fix for Testing

Create `app/api/stream-chat/route.ts`:
```typescript
export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Mock streaming response
      const chunks = ["Hello", " from", " HTTP", " streaming!"];
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(JSON.stringify({
          type: "text-delta",
          text: chunk,
          messageId: "test",
          timestamp: Date.now(),
        }) + "\n"));
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      controller.enqueue(encoder.encode(JSON.stringify({
        type: "completion",
        messageId: "test",
        timestamp: Date.now(),
      }) + "\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
```

Then update the client to use `/api/stream-chat` for local development.

## Recommendation

For now, **disable HTTP streaming** in settings and use standard Convex mutations. HTTP streaming requires a deployed Convex instance to work properly.