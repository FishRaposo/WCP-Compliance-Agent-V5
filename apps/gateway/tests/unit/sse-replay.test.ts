import { describe, expect, it } from "vitest";

describe("offline SSE replay", () => {
  it("replays locally published events after Last-Event-ID with stable IDs", async () => {
    const bridge = await import("../../src/lib/sse-bridge.js");
    bridge.clearSSEEventHistory();

    const first = bridge.publishSSEEvent("wcp.decisions", {
      type: "decision.created",
      data: { id: "decision-1" },
      timestamp: "2026-08-14T00:00:00.000Z",
    });
    const second = bridge.publishSSEEvent("wcp.decisions", {
      type: "decision.created",
      data: { id: "decision-2" },
      timestamp: "2026-08-14T00:00:01.000Z",
    });

    expect(first.streamId).toBe("local-1");
    expect(second.streamId).toBe("local-2");
    expect(bridge.getSSEEventsAfter("wcp.decisions", first.streamId)).toEqual([second]);
  });
});
