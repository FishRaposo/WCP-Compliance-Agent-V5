import { describe, it, expect } from "vitest";
import { RequestContext } from "@mastra/core/request-context";
import { routeVerdictModel, ROUTING_MODE_KEY } from "../../src/mastra/model-router.js";

function rc(mode?: string): RequestContext {
  const c = new RequestContext();
  if (mode) c.set(ROUTING_MODE_KEY, mode);
  return c;
}

describe("model-router", () => {
  it("compliance mode returns a fallback chain", () => {
    const model = routeVerdictModel({ requestContext: rc("compliance") });
    expect(Array.isArray(model)).toBe(true);
    expect((model as unknown[]).length).toBeGreaterThan(0);
  });

  it("defaults to compliance when mode is unset", () => {
    const model = routeVerdictModel({ requestContext: rc() });
    expect(Array.isArray(model)).toBe(true);
  });

  it("synthesis mode returns a fallback chain", () => {
    const model = routeVerdictModel({ requestContext: rc("synthesis") });
    expect(Array.isArray(model)).toBe(true);
  });

  it("cost mode without Ollama configured falls back to a single default model", () => {
    const model = routeVerdictModel({ requestContext: rc("cost") });
    expect(model).toBeDefined();
    expect(Array.isArray(model)).toBe(false);
  });
});
