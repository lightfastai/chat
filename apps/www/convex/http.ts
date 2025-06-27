import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { streamChatResponse } from "./httpStreaming";

const http = httpRouter();

auth.addHttpRoutes(http);

// HTTP streaming endpoint for chat responses
http.route({
  path: "/stream-chat",
  method: "POST",
  handler: streamChatResponse,
});

export default http;
