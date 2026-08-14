import { Hono } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";
import { createSSEBridge } from "../lib/sse-bridge.js";

export const streamRoutes = new Hono();

streamRoutes.get("/api/v1/decisions/stream", async (c) => {
  const connectionId = crypto.randomUUID();
  const redisUrl = process.env.REDIS_URL;

  // Identify the originating client so the per-client connection cap applies.
  let clientKey: string;
  try {
    clientKey = getConnInfo(c).remote.address ?? connectionId;
  } catch {
    clientKey = connectionId;
  }

  const streamConfig = {
    streamName: "wcp.decisions",
    consumerGroup: "sse-consumers",
    consumerName: connectionId,
  };
  const lastEventId = c.req.header("Last-Event-ID") ?? undefined;

  try {
    const stream = createSSEBridge(connectionId, streamConfig, redisUrl, clientKey, lastEventId);

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
