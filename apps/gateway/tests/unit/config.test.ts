import { describe, it, expect } from "vitest";

describe("gateway config", () => {
  it("config module exports expected fields", async () => {
    const mod = await import("../../src/config.js");
    expect(mod.config).toBeDefined();
    expect(mod.config.PORT).toBeDefined();
    expect(mod.config.AGENT_URL).toBeDefined();
    expect(mod.config.COMPLIANCE_CORE_URL).toBeDefined();
    expect(mod.config.DATA_PLATFORM_URL).toBeDefined();
    expect(mod.config.JWT_SECRET).toBeDefined();
    expect(mod.isAuthDisabled).toBeDefined();
  });

  it("PORT is a number", async () => {
    const mod = await import("../../src/config.js");
    expect(typeof mod.config.PORT).toBe("number");
  });

  it("corsOrigins returns array", async () => {
    const mod = await import("../../src/config.js");
    expect(Array.isArray(mod.corsOrigins)).toBe(true);
  });
});
