import { describe, it, expect } from "vitest";

describe("agent config", () => {
  it("config module exports expected fields", async () => {
    const mod = await import("../../src/config.js");
    expect(mod.config).toBeDefined();
    expect(mod.config.PORT).toBeDefined();
    expect(mod.config.LLM_MODE).toBeDefined();
    expect(mod.config.COMPLIANCE_CORE_URL).toBeDefined();
    expect(mod.config.DATA_PLATFORM_URL).toBeDefined();
    expect(mod.isMockMode).toBeDefined();
  });

  it("isMockMode is boolean", async () => {
    const mod = await import("../../src/config.js");
    expect(typeof mod.isMockMode).toBe("boolean");
  });

  it("TRUST_SCORE_HIGH_BAND is a number", async () => {
    const mod = await import("../../src/config.js");
    expect(typeof mod.config.TRUST_SCORE_HIGH_BAND).toBe("number");
  });
});
