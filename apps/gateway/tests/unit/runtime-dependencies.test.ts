import { createClient } from "redis";
import { describe, it, expect } from "vitest";

describe("runtime dependencies", () => {
  it("loads redis for the SSE Redis Streams bridge", () => {
    expect(createClient).toBeTypeOf("function");
  });
});
