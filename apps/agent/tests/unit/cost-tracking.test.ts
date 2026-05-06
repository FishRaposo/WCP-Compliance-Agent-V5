import { describe, it, expect } from "vitest";
import { computeCostUsd } from "../../src/observability/cost-tracking.js";

describe("cost-tracking", () => {
  it("computes gpt-4o cost correctly", () => {
    const cost = computeCostUsd("gpt-4o", 1000, 1000);
    expect(cost).toBeCloseTo(0.02); // 0.005 + 0.015
  });

  it("computes gpt-4o-mini cost correctly", () => {
    const cost = computeCostUsd("gpt-4o-mini", 2000, 500);
    // 2000/1000 * 0.00015 + 500/1000 * 0.0006 = 0.0003 + 0.0003 = 0.0006
    expect(cost).toBeCloseTo(0.0006);
  });

  it("computes claude cost correctly", () => {
    const cost = computeCostUsd("claude-sonnet-4-20250514", 1000, 500);
    // 1000/1000 * 0.003 + 500/1000 * 0.015 = 0.003 + 0.0075 = 0.0105
    expect(cost).toBeCloseTo(0.0105);
  });

  it("returns zero cost for free models", () => {
    const cost = computeCostUsd("llama3.2", 10000, 10000);
    expect(cost).toBe(0);
  });

  it("uses default rates for unknown models", () => {
    const cost = computeCostUsd("unknown-model", 1000, 1000);
    // 1000/1000 * 0.005 + 1000/1000 * 0.015 = 0.02
    expect(cost).toBeCloseTo(0.02);
  });
});
