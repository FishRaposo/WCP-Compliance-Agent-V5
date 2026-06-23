import { Hono } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";
import { createSSEBridge } from "../lib/sse-bridge.js";

export const streamRoutes = new Hono();

streamRoutes.get("/api/v1/decisions/stream", async (c) => {
  const connectionId = crypto.randomUUID();
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  // Identify the originating client so the per-client connection cap applies.
  const clientKey = ((): string => {
    try {
      return getConnInfo(c).remote.address ?? connectionId;
    } catch {
      return connectionId;
    }
  })();

  const streamConfig = {
    streamName: "wcp.decisions",
    consumerGroup: "sse-consumers",
    consumerName: connectionId,
  };

  try {
    const stream = createSSEBridge(connectionId, streamConfig, redisUrl, clientKey);

    return c.newResponse(stream, 200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("per client")) {
      return c.text("Too many SSE connections", 429);
    }
    return c.text("Failed to create SSE stream", 500);
  }
});
