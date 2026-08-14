import { afterEach, describe, expect, it } from "vitest";

import { closeStreamConsumer } from "../../src/lib/redis-streams.js";
import {
  clearSSEEventHistory,
  getSSEEventsAfter,
  publishSSEEvent,
} from "../../src/lib/sse-bridge.js";

describe("Redis connection fallback", () => {
  afterEach(async () => {
    clearSSEEventHistory();
    await closeStreamConsumer();
  });

  it("falls back locally when the configured Redis endpoint refuses connection", async () => {
    clearSSEEventHistory();

    const published = await publishSSEEvent(
      "wcp.decisions",
      {
        type: "decision.created",
        data: { id: "decision-refused-redis" },
        timestamp: "2026-08-14T00:00:04.000Z",
      },
      "redis://127.0.0.1:1",
    );

    expect(published.streamId).toBe("local-1");
    expect(getSSEEventsAfter("wcp.decisions")).toEqual([published]);
  }, 3_000);
});
