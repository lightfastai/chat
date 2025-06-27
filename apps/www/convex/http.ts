import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { streamChatResponse, streamContinue } from "./httpStreaming";

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

// HTTP streaming endpoint for chat responses
http.route({
	path: "/stream-chat",
	method: "POST",
	handler: streamChatResponse,
});

// CORS preflight for streaming endpoint
http.route({
	path: "/stream-chat",
	method: "OPTIONS",
	handler: streamChatResponse, // Same handler handles OPTIONS internally
});

// HTTP streaming continuation endpoint (for resuming streams)
http.route({
	path: "/stream-continue/:streamId",
	method: "GET",
	handler: streamContinue,
});

export default http;
