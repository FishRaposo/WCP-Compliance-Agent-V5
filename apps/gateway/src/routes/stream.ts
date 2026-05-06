import { Hono } from "hono";

const STREAM_KEY = "wcp.decisions";
const HEARTBEAT_INTERVAL = 15_000;
const POLL_INTERVAL = 3_000;

export const streamRoutes = new Hono();

streamRoutes.get("/api/v1/decisions/stream", async (c) => {
  let controller: ReadableStreamDefaultController;
  let redis: any = null;
  let lastId = "0";

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  const stream = new ReadableStream({
    async start(ctrl) {
      controller = ctrl;

      try {
        const mod = await import("redis") as any;
        const { createClient } = mod;
        redis = createClient({ url: redisUrl });
        await redis.connect();

        const entries = await redis.xRead(
          [{ key: STREAM_KEY, id: "0" }],
          { COUNT: 10 }
        );
        if (entries?.length > 0) {
          for (const entry of entries[0].messages) {
            const data = entry.message;
            controller.enqueue(
              `event: decision\ndata: ${JSON.stringify(data)}\n\n`
            );
            lastId = entry.id;
          }
        }
      } catch {
        // Redis not available, heartbeat only
      }

      controller.enqueue(
        `event: heartbeat\ndata: {"timestamp":"${new Date().toISOString()}"}\n\n`
      );

      let poller: ReturnType<typeof setInterval> | null = null;
      if (redis) {
        poller = setInterval(async () => {
          try {
            const entries = await redis.xRead(
              [{ key: STREAM_KEY, id: lastId }],
              { COUNT: 50, BLOCK: 1000 }
            );
            if (entries?.length > 0) {
              for (const entry of entries[0].messages) {
                if (entry.id === lastId) continue;
                const data = entry.message;
                controller.enqueue(
                  `event: decision\ndata: ${JSON.stringify(data)}\n\n`
                );
                lastId = entry.id;
              }
            }
          } catch {
            if (poller) clearInterval(poller);
          }
        }, POLL_INTERVAL);
      }

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            `event: heartbeat\ndata: {"timestamp":"${new Date().toISOString()}"}\n\n`
          );
        } catch {
          clearInterval(heartbeat);
          if (poller) clearInterval(poller);
        }
      }, HEARTBEAT_INTERVAL);

      c.req.raw.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        if (poller) clearInterval(poller);
        if (redis) redis.quit().catch(() => {});
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return c.newResponse(stream, 200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
});
