import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { streamChatResponse } from "./httpStreaming";
import { streamChatResponseV2 } from "./httpStreamingV2";

const http = httpRouter();

auth.addHttpRoutes(http);

// Test endpoint to verify HTTP routing works
http.route({
	path: "/test",
	method: "GET",
	handler: httpAction(async () => {
		return new Response("HTTP endpoint is working!", {
			status: 200,
			headers: {
				"Content-Type": "text/plain",
				"Access-Control-Allow-Origin": "*",
			},
		});
	}),
});

// HTTP streaming endpoint for chat responses (legacy)
http.route({
	path: "/stream-chat",
	method: "POST",
	handler: streamChatResponse,
});

// CORS preflight for streaming endpoint (legacy)
http.route({
	path: "/stream-chat",
	method: "OPTIONS",
	handler: streamChatResponse, // Same handler handles OPTIONS internally
});

// HTTP streaming endpoint v2 with UIMessage support
http.route({
	path: "/stream-chat-v2",
	method: "POST",
	handler: streamChatResponseV2,
});

// CORS preflight for streaming endpoint v2
http.route({
	path: "/stream-chat-v2",
	method: "OPTIONS",
	handler: streamChatResponseV2, // Same handler handles OPTIONS internally
});

export default http;
