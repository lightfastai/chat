import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { streamChatResponse } from "./httpStreaming";

const http = httpRouter();

auth.addHttpRoutes(http);

// HTTP streaming endpoint with modern AI SDK v5 support
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

export default http;
