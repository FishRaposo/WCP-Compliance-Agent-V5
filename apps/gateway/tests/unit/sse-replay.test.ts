import { describe, expect, it } from "vitest";
import { Hono } from "hono";

describe("offline SSE replay", () => {
  it("replays locally published events after Last-Event-ID with stable IDs", async () => {
    const bridge = await import("../../src/lib/sse-bridge.js");
    bridge.clearSSEEventHistory();

    const first = await bridge.publishSSEEvent("wcp.decisions", {
      type: "decision.created",
      data: { id: "decision-1" },
      timestamp: "2026-08-14T00:00:00.000Z",
    });
    const second = await bridge.publishSSEEvent("wcp.decisions", {
      type: "decision.created",
      data: { id: "decision-2" },
      timestamp: "2026-08-14T00:00:01.000Z",
    });

    expect(first.streamId).toBe("local-1");
    expect(second.streamId).toBe("local-2");
    expect(bridge.getSSEEventsAfter("wcp.decisions", first.streamId)).toEqual([second]);
  });

  it("replays only newer local events through the HTTP route", async () => {
    const previousRedisUrl = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    const bridge = await import("../../src/lib/sse-bridge.js");
    bridge.clearSSEEventHistory();

    try {
      const first = await bridge.publishSSEEvent("wcp.decisions", {
        type: "decision.created",
        data: { id: "decision-route-1" },
        timestamp: "2026-08-14T00:00:00.000Z",
      });
      await bridge.publishSSEEvent("wcp.decisions", {
        type: "decision.created",
        data: { id: "decision-route-2" },
        timestamp: "2026-08-14T00:00:01.000Z",
      });
      const { streamRoutes } = await import("../../src/routes/stream.js");
      const app = new Hono();
      app.route("/", streamRoutes);

      const response = await app.request("/api/v1/decisions/stream", {
        headers: { "Last-Event-ID": first.streamId! },
      });
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      const chunks: string[] = [];
      for (let index = 0; index < 2; index += 1) {
        const result = await reader.read();
        if (result.value) chunks.push(decoder.decode(result.value));
      }
      await reader.cancel();
      const body = chunks.join("");

      expect(response.headers.get("content-type")).toContain("text/event-stream");
      expect(body).toContain("id: local-2");
      expect(body).toContain('{"id":"decision-route-2"}');
      expect(body).not.toContain("decision-route-1");
    } finally {
      bridge.closeAllSSEConnections();
      if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
      else process.env.REDIS_URL = previousRedisUrl;
    }
  });
});
