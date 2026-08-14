import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const redis = vi.hoisted(() => ({
  xreadgroup: vi.fn(),
  xrange: vi.fn(),
  xack: vi.fn(),
  xadd: vi.fn(),
  xgroup: vi.fn(),
  connect: vi.fn(),
  quit: vi.fn(),
  on: vi.fn(),
}));

vi.mock("redis", () => ({
  createClient: () => redis,
}));

describe("Redis SSE resume", () => {
  afterEach(async () => {
    const streams = await import("../../src/lib/redis-streams.js");
    await streams.closeStreamConsumer();
    vi.resetAllMocks();
  });

  it("publishes SSE fields to Redis without changing the event payload", async () => {
    redis.xadd.mockResolvedValue("175-0");
    const bridge = await import("../../src/lib/sse-bridge.js");
    bridge.clearSSEEventHistory();

    const published = await bridge.publishSSEEvent(
      "wcp.decisions",
      {
        type: "decision.created",
        data: { id: "decision-published", verdict: "approved" },
        timestamp: "2026-08-14T00:00:02.000Z",
      },
      "redis://test",
    );

    expect(redis.xadd).toHaveBeenCalledWith(
      "wcp.decisions",
      "*",
      "type",
      "decision.created",
      "event",
      '{"id":"decision-published","verdict":"approved"}',
      "timestamp",
      "2026-08-14T00:00:02.000Z",
    );
    expect(published).toEqual({
      type: "decision.created",
      data: { id: "decision-published", verdict: "approved" },
      timestamp: "2026-08-14T00:00:02.000Z",
      streamId: "175-0",
    });
    expect(bridge.getSSEEventsAfter("wcp.decisions")).toEqual([]);
  });

  it("replays history after Last-Event-ID before resuming acknowledged group reads", async () => {
    redis.xrange.mockResolvedValue([
      ["173-1", ["type", "decision.created", "event", "{\"id\":\"decision-1\"}"]],
    ]);
    redis.xreadgroup.mockResolvedValue([
      ["wcp.decisions", [["174-0", ["type", "decision.created", "event", "{\"id\":\"decision-2\"}"]]]],
    ]);
    redis.xack.mockResolvedValue(1);
    const handler = vi.fn();
    const { readStreamMessages, replayStreamMessages } = await import(
      "../../src/lib/redis-streams.js"
    );

    await replayStreamMessages(
      {
        streamName: "wcp.decisions",
        consumerGroup: "sse-consumers",
        consumerName: "connection-1",
      },
      handler,
      "173-0",
      "redis://test",
    );

    expect(redis.xrange).toHaveBeenCalledWith("wcp.decisions", "(173-0", "+");
    expect(handler).toHaveBeenCalledWith("173-1", {
      type: "decision.created",
      event: '{"id":"decision-1"}',
    });
    expect(redis.xack).not.toHaveBeenCalled();

    await readStreamMessages(
      {
        streamName: "wcp.decisions",
        consumerGroup: "sse-consumers",
        consumerName: "connection-1",
      },
      handler,
      1,
      "redis://test",
    );

    expect(redis.xreadgroup).toHaveBeenCalledWith(
      "GROUP",
      "sse-consumers",
      "connection-1",
      "BLOCK",
      "1",
      "COUNT",
      "100",
      "STREAMS",
      "wcp.decisions",
      ">",
    );
    expect(handler).toHaveBeenCalledWith("174-0", {
      type: "decision.created",
      event: '{"id":"decision-2"}',
    });
    expect(redis.xack).toHaveBeenCalledWith("wcp.decisions", "sse-consumers", "174-0");
  });

  it("replays Redis history through the HTTP route with unchanged SSE fields", async () => {
    const previousRedisUrl = process.env.REDIS_URL;
    process.env.REDIS_URL = "redis://test";
    redis.xgroup.mockResolvedValue("OK");
    redis.xrange.mockResolvedValue([
      ["173-1", ["type", "decision.created", "event", "{\"id\":\"decision-route\"}"]],
    ]);

    try {
      const { streamRoutes } = await import("../../src/routes/stream.js");
      const app = new Hono();
      app.route("/", streamRoutes);

      const response = await app.request("/api/v1/decisions/stream", {
        headers: { "Last-Event-ID": "173-0" },
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

      expect(body).toContain("event: decision.created");
      expect(body).toContain('data: {"id":"decision-route"}');
      expect(body).toContain("id: 173-1");
    } finally {
      const bridge = await import("../../src/lib/sse-bridge.js");
      bridge.closeAllSSEConnections();
      if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
      else process.env.REDIS_URL = previousRedisUrl;
    }
  });
});
