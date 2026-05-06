import { Hono } from "hono";
import { createSSEBridge } from "../lib/sse-bridge.js";

export const streamRoutes = new Hono();

streamRoutes.get("/api/v1/decisions/stream", async (c) => {
  const connectionId = crypto.randomUUID();
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  
  const streamConfig = {
    streamName: "wcp.decisions",
    consumerGroup: "sse-consumers",
    consumerName: connectionId,
  };

  try {
    const stream = createSSEBridge(connectionId, streamConfig, redisUrl);
    
    return c.newResponse(stream, 200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
  } catch (err) {
    return c.text("Failed to create SSE stream", 500);
  }
});
