import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const redis = vi.hoisted(() => ({
  xRead: vi.fn(),
  xReadGroup: vi.fn(),
  xRange: vi.fn(),
  xAck: vi.fn(),
  xAdd: vi.fn(),
  xGroupCreate: vi.fn(),
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
    const bridge = await import("../../src/lib/sse-bridge.js");
    bridge.closeAllSSEConnections();
    bridge.clearSSEEventHistory();
    await streams.closeStreamConsumer();
    vi.resetAllMocks();
  });

  it("creates consumer groups through the node-redis v5 helper", async () => {
    redis.xGroupCreate.mockResolvedValue("OK");
    const { ensureConsumerGroup } = await import("../../src/lib/redis-streams.js");

    await ensureConsumerGroup(
      {
        streamName: "wcp.decisions",
        consumerGroup: "sse-consumers",
        consumerName: "connection-1",
      },
      "redis://test",
    );

    expect(redis.xGroupCreate).toHaveBeenCalledWith(
      "wcp.decisions",
      "sse-consumers",
      "0",
      { MKSTREAM: true },
    );
  });

  it("publishes SSE fields to Redis without changing the event payload", async () => {
    redis.xAdd.mockResolvedValue("175-0");
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

    expect(redis.xAdd).toHaveBeenCalledWith(
      "wcp.decisions",
      "*",
      {
        type: "decision.created",
        event: '{"id":"decision-published","verdict":"approved"}',
        timestamp: "2026-08-14T00:00:02.000Z",
      },
    );
    expect(published).toEqual({
      type: "decision.created",
      data: { id: "decision-published", verdict: "approved" },
      timestamp: "2026-08-14T00:00:02.000Z",
      streamId: "175-0",
    });
    expect(bridge.getSSEEventsAfter("wcp.decisions")).toEqual([]);
  });

  it("replays strictly after Last-Event-ID with structured camel-case XRANGE", async () => {
    redis.xRange.mockResolvedValue([
      {
        id: "173-0",
        message: { type: "decision.created", event: '{"id":"already-seen"}' },
      },
      {
        id: "173-1",
        message: { type: "decision.created", event: '{"id":"decision-1"}' },
      },
    ]);
    const handler = vi.fn();
    const { replayStreamMessages } = await import("../../src/lib/redis-streams.js");

    const processed = await replayStreamMessages(
      {
        streamName: "wcp.decisions",
        consumerGroup: "sse-consumers",
        consumerName: "connection-1",
      },
      handler,
      "173-0",
      "redis://test",
    );

    expect(redis.xRange).toHaveBeenCalledWith("wcp.decisions", "173-0", "+");
    expect(processed).toBe(1);
    expect(handler).not.toHaveBeenCalledWith("173-0", expect.anything());
    expect(handler).toHaveBeenCalledWith("173-1", {
      type: "decision.created",
      event: '{"id":"decision-1"}',
    });
  });

  it("preserves the public consumer-group helper with node-redis v5 signatures", async () => {
    redis.xReadGroup.mockResolvedValue([
      {
        name: "wcp.decisions",
        messages: [
          {
            id: "174-0",
            message: { type: "decision.created", event: '{"id":"decision-2"}' },
          },
        ],
      },
    ]);
    redis.xAck.mockResolvedValue(1);
    const handler = vi.fn();
    const { readStreamMessages } = await import("../../src/lib/redis-streams.js");

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

    expect(redis.xReadGroup).toHaveBeenCalledWith(
      "sse-consumers",
      "connection-1",
      { key: "wcp.decisions", id: ">" },
      { BLOCK: 1, COUNT: 100 },
    );
    expect(handler).toHaveBeenCalledWith("174-0", {
      type: "decision.created",
      event: '{"id":"decision-2"}',
    });
    expect(redis.xAck).toHaveBeenCalledWith("wcp.decisions", "sse-consumers", "174-0");
  });

  it("reads the same live event for two clients from their independent cursors", async () => {
    redis.xRead.mockResolvedValue([
      {
        name: "wcp.decisions",
        messages: [
          {
            id: "174-0",
            message: { type: "decision.created", event: '{"id":"broadcast"}' },
          },
        ],
      },
    ]);
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    const { readStreamMessagesAfter } = await import("../../src/lib/redis-streams.js");

    const first = await readStreamMessagesAfter(
      {
        streamName: "wcp.decisions",
        consumerGroup: "sse-consumers",
        consumerName: "connection-1",
      },
      firstHandler,
      "173-1",
      1,
      "redis://test",
    );
    const second = await readStreamMessagesAfter(
      {
        streamName: "wcp.decisions",
        consumerGroup: "sse-consumers",
        consumerName: "connection-2",
      },
      secondHandler,
      "173-0",
      1,
      "redis://test",
    );

    expect(redis.xRead).toHaveBeenNthCalledWith(
      1,
      { key: "wcp.decisions", id: "173-1" },
      { BLOCK: 1, COUNT: 100 },
    );
    expect(redis.xRead).toHaveBeenNthCalledWith(
      2,
      { key: "wcp.decisions", id: "173-0" },
      { BLOCK: 1, COUNT: 100 },
    );
    expect(firstHandler).toHaveBeenCalledWith("174-0", {
      type: "decision.created",
      event: '{"id":"broadcast"}',
    });
    expect(secondHandler).toHaveBeenCalledWith("174-0", {
      type: "decision.created",
      event: '{"id":"broadcast"}',
    });
    expect(first).toEqual({ processed: 1, cursor: "174-0" });
    expect(second).toEqual({ processed: 1, cursor: "174-0" });
    expect(redis.xAck).not.toHaveBeenCalled();
  });

  it("replays Redis history through the HTTP route with unchanged SSE fields", async () => {
    const previousRedisUrl = process.env.REDIS_URL;
    process.env.REDIS_URL = "redis://test";
    redis.xRange.mockResolvedValue([
      {
        id: "173-1",
        message: { type: "decision.created", event: '{"id":"decision-route"}' },
      },
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
