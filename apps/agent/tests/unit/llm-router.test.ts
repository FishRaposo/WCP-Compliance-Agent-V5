import { describe, it, expect, vi } from "vitest";
import { LLMRouter, type RoutingContext } from "../../src/model-router/llm-router.js";

describe("LLMRouter", () => {
  const router = new LLMRouter();

  describe("selectProvider", () => {
    it("selects gpt-4o for compliance-critical tasks", () => {
      const ctx: RoutingContext = { complianceCritical: true };
      const config = router.selectProvider(ctx);
      expect(config.provider).toBe("openai");
      expect(config.model).toBe("gpt-4o");
    });

    it("selects openai with gpt-4o-mini for cost mode when no ollama URL set", () => {
      const ctx: RoutingContext = { costMode: true };
      const config = router.selectProvider(ctx);
      expect(config.provider).toBe("openai");
      expect(config.model).toBe("gpt-4o-mini");
    });

    it("compliance-critical overrides cost mode", () => {
      const ctx: RoutingContext = { complianceCritical: true, costMode: true };
      const config = router.selectProvider(ctx);
      expect(config.provider).toBe("openai");
      expect(config.model).toBe("gpt-4o");
    });

    it("defaults to openai gpt-4o-mini", () => {
      const config = router.selectProvider({});
      expect(config.provider).toBe("openai");
      expect(config.model).toBe("gpt-4o-mini");
    });
  });

  describe("createModel", () => {
    it("returns a language model for openai", () => {
      const model = router.createModel({ provider: "openai", model: "gpt-4o-mini" });
      expect(model).toBeDefined();
    });

    it("returns a language model for anthropic", () => {
      const model = router.createModel({ provider: "anthropic", model: "claude-sonnet-4-20250514" });
      expect(model).toBeDefined();
    });
  });
});
