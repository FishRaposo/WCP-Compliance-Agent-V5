import { describe, it, expect } from "vitest";

describe("Gateway", () => {
  it("has a health check module", async () => {
    const mod = await import("./routes/health.js");
    expect(mod.healthRoutes).toBeDefined();
  });
});
